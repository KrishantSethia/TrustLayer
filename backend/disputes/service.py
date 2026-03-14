from datetime import datetime
from database import get_db
from exceptions import NotFoundError, BadRequestError
from milestones.service import complete_milestone_paid
from payments.banking import transfer_money, withdraw_from_escrow
from pfi.engine import update_pfi, P_ARB_EMPLOYER_WON, P_ARB_ESCALATION_LOST
from config import settings


def _enrich_dispute(dispute: dict, db) -> dict:
    """Attach milestone + project data to a dispute dict."""
    if not dispute:
        return dispute
    ms = db.table("milestones").select("*").eq("id", dispute["milestone_id"]).single().execute().data
    if ms:
        proj = db.table("projects").select("*").eq("id", ms["project_id"]).single().execute().data
        if proj:
            employer = db.table("users").select("id, name, email, employer_trust_score").eq(
                "id", proj["employer_id"]
            ).single().execute().data if proj.get("employer_id") else None
            freelancer = db.table("users").select("id, name, pfi_score").eq(
                "id", proj["freelancer_id"]
            ).single().execute().data if proj.get("freelancer_id") else None
            proj["employer"] = employer
            proj["freelancer"] = freelancer
            ms["projects"] = proj
        dispute["milestones"] = ms
    return dispute


def get_dispute(dispute_id: str) -> dict:
    db = get_db()
    dispute = db.table("disputes").select("*").eq("id", dispute_id).single().execute().data
    if not dispute:
        raise NotFoundError("Dispute")
    return _enrich_dispute(dispute, db)


def list_disputes(ruling_filter: str = None) -> list:
    db = get_db()

    query = db.table("disputes").select("*")
    if ruling_filter:
        query = query.eq("ruling", ruling_filter)
    else:
        query = query.eq("ruling", "PENDING")

    disputes = query.order("created_at").execute().data

    # Enrich each dispute with milestone + project info
    milestone_ids = [d["milestone_id"] for d in disputes if d.get("milestone_id")]
    milestones_map = {}
    if milestone_ids:
        ms_rows = db.table("milestones").select(
            "id, title, status, payout_amount, project_id"
        ).in_("id", milestone_ids).execute().data
        milestones_map = {str(m["id"]): m for m in ms_rows}

        project_ids = list({m["project_id"] for m in ms_rows if m.get("project_id")})
        projects_map = {}
        if project_ids:
            proj_rows = db.table("projects").select(
                "id, title, employer_id, freelancer_id"
            ).in_("id", project_ids).execute().data
            projects_map = {str(p["id"]): p for p in proj_rows}

        for ms in ms_rows:
            ms["projects"] = projects_map.get(str(ms["project_id"]))

    for dispute in disputes:
        dispute["milestones"] = milestones_map.get(str(dispute.get("milestone_id")))

    return disputes


def rule_dispute(dispute_id: str, ruling: str, admin_notes: str) -> dict:
    db = get_db()

    dispute = db.table("disputes").select("*").eq("id", dispute_id).single().execute().data
    if not dispute:
        raise NotFoundError("Dispute")
    if dispute["ruling"] != "PENDING":
        raise BadRequestError(f"Dispute already ruled: {dispute['ruling']}")

    ms = db.table("milestones").select("*").eq("id", dispute["milestone_id"]).single().execute().data
    if not ms:
        raise NotFoundError("Milestone")

    proj = db.table("projects").select("*").eq("id", ms["project_id"]).single().execute().data
    if not proj:
        raise NotFoundError("Project")

    freelancer_id = proj["freelancer_id"]
    employer_id = proj["employer_id"]
    now = datetime.now().isoformat()

    # Update dispute record first
    db.table("disputes").update({
        "ruling": ruling,
        "admin_notes": admin_notes,
        "updated_at": now,
    }).eq("id", dispute_id).execute()

    dispute_type = dispute.get("dispute_type", "EMPLOYER_VETO")

    # ── FREELANCER ESCALATION (disputed AI rejection) ──────────────────────
    if dispute_type == "FREELANCER_ESCALATION":
        if ruling == "FREELANCER_WIN":
            # AI was wrong — reset milestone to IN_PROGRESS for a fresh attempt
            db.table("milestones").update({
                "status": "IN_PROGRESS",
                "deliverable_text": None,
                "ai_evaluation_json": None,
                "submission_count": ms.get("submission_count", 0),  # keep count
                "updated_at": now,
            }).eq("id", ms["id"]).execute()

            return {
                "ruling": "FREELANCER_WIN",
                "dispute_type": "FREELANCER_ESCALATION",
                "milestone_status": "IN_PROGRESS",
                "pfi_delta": 0,
            }

        else:  # EMPLOYER_WIN — AI was right; PFI penalised, but freelancer can still revise & resubmit
            db.table("milestones").update({
                "status": "AI_REJECTED",
                "updated_at": now,
            }).eq("id", ms["id"]).execute()

            update_pfi(freelancer_id, 0, 0, P_ARB_ESCALATION_LOST)

            return {
                "ruling": "EMPLOYER_WIN",
                "dispute_type": "FREELANCER_ESCALATION",
                "milestone_status": "AI_REJECTED",
                "pfi_delta": -P_ARB_ESCALATION_LOST,
            }

    # ── EMPLOYER VETO (disputed AI approval) ──────────────────────────────
    else:  # EMPLOYER_VETO
        if ruling == "FREELANCER_WIN":
            # Freelancer gets paid — same as normal auto-release
            complete_milestone_paid(ms["id"], triggered_by="DISPUTE_RULING")

            # Employer trust score penalty + loses arb fee
            employer_data = db.table("users").select("employer_trust_score").eq(
                "id", employer_id
            ).single().execute().data
            current_trust = employer_data.get("employer_trust_score") or 500
            db.table("users").update({
                "employer_trust_score": max(0, current_trust - 50),
                "updated_at": now,
            }).eq("id", employer_id).execute()

            # Arb fee → platform revenue (employer forfeits it)
            arb_fee = dispute.get("arbitration_fee") or 0
            if arb_fee > 0:
                withdraw_from_escrow(arb_fee)
                # Deduct arb fee from project escrow tracking
                fresh_proj = db.table("projects").select("escrow_held").eq("id", proj["id"]).single().execute().data
                db.table("projects").update({
                    "escrow_held": max(0, (fresh_proj["escrow_held"] or 0) - arb_fee),
                    "updated_at": now,
                }).eq("id", proj["id"]).execute()

            return {
                "ruling": "FREELANCER_WIN",
                "dispute_type": "EMPLOYER_VETO",
                "milestone_status": "COMPLETED_PAID",
                "employer_trust_score_penalty": -50,
                "arb_fee_forfeited": arb_fee,
                "pfi_delta": None,
            }

        else:  # EMPLOYER_WIN — employer was right, work didn't meet criteria
            # Reset milestone so freelancer can revise & resubmit (escrow stays locked)
            db.table("milestones").update({
                "status": "IN_PROGRESS",
                "deliverable_text": None,
                "ai_evaluation_json": None,
                "submission_count": ms.get("submission_count", 0),  # keep count
                "updated_at": now,
            }).eq("id", ms["id"]).execute()

            update_pfi(freelancer_id, 0, 0, P_ARB_EMPLOYER_WON)

            # Refund employer's arb fee since they won
            arb_fee = dispute.get("arbitration_fee") or 0
            if arb_fee > 0:
                transfer_money(settings.PLATFORM_ESCROW_USER_ID, employer_id, arb_fee)
                # Deduct arb fee from project escrow tracking
                fresh_proj = db.table("projects").select("escrow_held").eq("id", proj["id"]).single().execute().data
                db.table("projects").update({
                    "escrow_held": max(0, (fresh_proj["escrow_held"] or 0) - arb_fee),
                    "updated_at": now,
                }).eq("id", proj["id"]).execute()

            return {
                "ruling": "EMPLOYER_WIN",
                "dispute_type": "EMPLOYER_VETO",
                "milestone_status": "IN_PROGRESS",
                "pfi_delta": -P_ARB_EMPLOYER_WON,
                "arb_fee_refunded": arb_fee,
            }
