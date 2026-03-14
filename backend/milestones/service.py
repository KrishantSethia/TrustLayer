from datetime import datetime, timedelta
from database import get_db
from config import settings
from exceptions import NotFoundError, ForbiddenError, BadRequestError, ConflictError
from milestones.state_machine import MilestoneStatus, assert_transition
from milestones.decay import calculate_current_payout, calculate_time_delta
from ai.handlers.registry import get_handler
from ai.llm_client import chat_completion_json, LLMError, LLMParseError
from payments.banking import transfer_money, withdraw_from_escrow
from pfi.engine import (
    update_pfi, get_fee_tier,
    DELTA_Q_FIRST_TRY, DELTA_Q_LATER_TRY, DELTA_Q_REJECTED,
    DELTA_T_EARLY, DELTA_T_ONTIME, DELTA_T_LATE,
)


def _get_milestone_with_project(milestone_id: str) -> tuple[dict, dict]:
    db = get_db()
    ms = db.table("milestones").select("*").eq("id", milestone_id).single().execute().data
    if not ms:
        raise NotFoundError("Milestone")
    proj = db.table("projects").select("*").eq("id", ms["project_id"]).single().execute().data
    if not proj:
        raise NotFoundError("Project")
    return ms, proj


async def submit_milestone(milestone_id: str, freelancer_id: str, deliverable_text: str) -> dict:
    db = get_db()
    ms, proj = _get_milestone_with_project(milestone_id)

    # Auth checks
    if proj["freelancer_id"] != freelancer_id:
        raise ForbiddenError("You are not assigned to this project")
    if ms["status"] not in ("IN_PROGRESS", "AI_REJECTED"):
        if ms["status"] == "AI_EVALUATING":
            raise ConflictError("Milestone is already being evaluated — please wait")
        raise BadRequestError(f"Milestone is not submittable (current: {ms['status']})")

    # Validate deliverable
    try:
        handler = get_handler(proj["category"])
        handler.validate_deliverable(deliverable_text)
    except ValueError as e:
        raise BadRequestError(str(e))

    new_count = ms["submission_count"] + 1

    # Mark AI_EVALUATING + increment submission_count BEFORE AI call
    db.table("milestones").update({
        "status": "AI_EVALUATING",
        "deliverable_text": deliverable_text,
        "submission_count": new_count,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", milestone_id).execute()

    # Call AI judge
    judge_prompt = handler.get_judge_prompt()
    actual_word_count = len(deliverable_text.split())
    user_message = (
        f"[METADATA — use these exact figures, do not re-estimate]\n"
        f"Word count: {actual_word_count} words\n\n"
        f"Success criteria:\n{ms['ai_success_criteria']}\n\n"
    )
    # For translation: include the source text so the judge can compare
    if proj.get("category") == "TRANSLATION" and proj.get("source_text"):
        user_message += f"--- SOURCE TEXT (original to translate) ---\n{proj['source_text']}\n\n"
    user_message += f"Submitted work:\n{deliverable_text}"

    try:
        evaluation = await chat_completion_json(judge_prompt, user_message)
    except (LLMError, LLMParseError) as e:
        # Reset to IN_PROGRESS on AI failure
        db.table("milestones").update({
            "status": "IN_PROGRESS",
            "updated_at": datetime.now().isoformat(),
        }).eq("id", milestone_id).execute()
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=f"AI evaluation failed: {str(e)}")

    ai_status = evaluation.get("status", "UNMET")
    time_delta = calculate_time_delta(ms)

    if ai_status == "FULLY_MET":
        auto_release_at = datetime.now() + timedelta(seconds=settings.AUTO_RELEASE_SECONDS)
        db.table("milestones").update({
            "status": "AI_APPROVED_PENDING",
            "ai_evaluation_json": evaluation,
            "auto_release_at": auto_release_at.isoformat(),
            "updated_at": datetime.now().isoformat(),
        }).eq("id", milestone_id).execute()

        quality_delta = DELTA_Q_FIRST_TRY if new_count == 1 else DELTA_Q_LATER_TRY
        update_pfi(freelancer_id, quality_delta, time_delta, 0)

        return {
            "evaluation": evaluation,
            "milestone_status": "AI_APPROVED_PENDING",
            "auto_release_at": auto_release_at.isoformat(),
            "pfi_delta": quality_delta + time_delta,
        }

    elif ai_status == "PARTIALLY_MET":
        db.table("milestones").update({
            "status": "AI_REJECTED",
            "ai_evaluation_json": evaluation,
            "updated_at": datetime.now().isoformat(),
        }).eq("id", milestone_id).execute()

        return {
            "evaluation": evaluation,
            "milestone_status": "AI_REJECTED",
            "auto_release_at": None,
            "pfi_delta": None,
        }

    else:  # UNMET
        db.table("milestones").update({
            "status": "AI_REJECTED",
            "ai_evaluation_json": evaluation,
            "updated_at": datetime.now().isoformat(),
        }).eq("id", milestone_id).execute()

        update_pfi(freelancer_id, DELTA_Q_REJECTED, 0, 0)

        return {
            "evaluation": evaluation,
            "milestone_status": "AI_REJECTED",
            "auto_release_at": None,
            "pfi_delta": DELTA_Q_REJECTED,
        }


def complete_milestone_paid(milestone_id: str, triggered_by: str = "MANUAL") -> dict:
    """Pays out a milestone. Called by auto_release cron or dispute ruling."""
    db = get_db()
    ms, proj = _get_milestone_with_project(milestone_id)

    # Idempotency: if already paid, return current state without re-transferring
    if ms["status"] == "COMPLETED_PAID":
        return ms

    if ms["status"] not in ("AI_APPROVED_PENDING", "DISPUTE_ACTIVE"):
        raise BadRequestError(f"Cannot complete milestone in status {ms['status']}")

    freelancer_id = proj["freelancer_id"]
    final_payout = calculate_current_payout(ms)
    freelancer_row = db.table("users").select("pfi_score").eq("id", freelancer_id).single().execute().data
    pfi_rate = get_fee_tier((freelancer_row or {}).get("pfi_score") or 500)
    fee_rate = pfi_rate["fee_percent"] / 100
    platform_fee = int(final_payout * fee_rate)
    net_payout = final_payout - platform_fee

    # Transfer escrow → freelancer
    if net_payout > 0:
        transfer_money(settings.PLATFORM_ESCROW_USER_ID, freelancer_id, net_payout)
    if platform_fee > 0:
        withdraw_from_escrow(platform_fee)

    # Update project escrow tracking
    db.table("projects").update({
        "escrow_held": max(0, (proj["escrow_held"] or 0) - final_payout),
        "milestone_frozen": (proj["milestone_frozen"] or 0) + net_payout,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", proj["id"]).execute()

    db.table("milestones").update({
        "status": "COMPLETED_PAID",
        "final_payout": net_payout,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", milestone_id).execute()

    # Activate next milestone if any
    next_ms = db.table("milestones").select("*").eq("project_id", proj["id"]).eq(
        "sequence_number", ms["sequence_number"] + 1
    ).single().execute().data

    if next_ms:
        db.table("milestones").update({
            "status": "IN_PROGRESS",
            "updated_at": datetime.now().isoformat(),
        }).eq("id", next_ms["id"]).execute()
    else:
        # All milestones done — complete the project
        _complete_project(proj, freelancer_id)

    return db.table("milestones").select("*").eq("id", milestone_id).single().execute().data


def _complete_project(proj: dict, freelancer_id: str) -> None:
    """Releases success fee when all milestones are COMPLETED_PAID."""
    db = get_db()
    success_fee = proj["success_fee"] or 0
    fl_row = db.table("users").select("pfi_score").eq("id", freelancer_id).single().execute().data
    pfi_score = (fl_row or {}).get("pfi_score") or 500
    fee_rate = get_fee_tier(pfi_score)["fee_percent"] / 100
    platform_fee = int(success_fee * fee_rate)
    net_success_fee = success_fee - platform_fee

    if net_success_fee > 0:
        transfer_money(settings.PLATFORM_ESCROW_USER_ID, freelancer_id, net_success_fee)
    if platform_fee > 0:
        withdraw_from_escrow(platform_fee)

    # Refund any decay residual (late penalties saved employer money)
    # Re-read escrow_held to get the latest value after milestone payouts
    fresh_proj = db.table("projects").select("escrow_held").eq("id", proj["id"]).single().execute().data
    residual = max(0, (fresh_proj["escrow_held"] or 0) - success_fee)
    if residual > 0:
        transfer_money(settings.PLATFORM_ESCROW_USER_ID, proj["employer_id"], residual)

    db.table("projects").update({
        "status": "COMPLETED",
        "escrow_held": 0,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", proj["id"]).execute()


def veto_milestone(milestone_id: str, employer_id: str) -> dict:
    """Step 1: create a Razorpay order for the arbitration fee. Frontend opens checkout."""
    db = get_db()
    ms, proj = _get_milestone_with_project(milestone_id)

    if proj["employer_id"] != employer_id:
        raise ForbiddenError("Not your project")
    if ms["status"] != "AI_APPROVED_PENDING":
        raise BadRequestError("Can only veto AI_APPROVED_PENDING milestones")

    arb_fee = int((ms["payout_amount"] or 0) * 0.05)
    if arb_fee <= 0:
        # Zero-value milestone edge case — skip payment, go straight to dispute
        return confirm_veto(milestone_id, employer_id, razorpay_payment_id=None)

    from payments.razorpay_client import create_order as rz_create_order
    from config import settings as cfg
    try:
        order = rz_create_order(
            amount_paise=arb_fee,
            receipt=f"veto_{milestone_id[:8]}",
        )
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {str(e)}")

    return {
        "razorpay_order_id": order["id"],
        "razorpay_key_id": cfg.RAZORPAY_KEY_ID,
        "amount": arb_fee,
        "currency": "INR",
        "milestone_id": milestone_id,
        "step": "payment_required",
    }


def confirm_veto(milestone_id: str, employer_id: str, razorpay_payment_id: str | None) -> dict:
    """Step 2: payment confirmed via Razorpay — deposit arb fee to escrow, create dispute."""
    db = get_db()
    ms, proj = _get_milestone_with_project(milestone_id)

    if proj["employer_id"] != employer_id:
        raise ForbiddenError("Not your project")
    if ms["status"] != "AI_APPROVED_PENDING":
        raise BadRequestError("Can only veto AI_APPROVED_PENDING milestones")

    arb_fee = int((ms["payout_amount"] or 0) * 0.05)

    # Deposit arb fee into platform escrow (employer paid via Razorpay card)
    if arb_fee > 0 and razorpay_payment_id:
        from payments.banking import deposit_to_escrow
        deposit_to_escrow(arb_fee)
        # Track arb fee in project escrow so accounting balances
        db.table("projects").update({
            "escrow_held": (proj["escrow_held"] or 0) + arb_fee,
            "updated_at": datetime.now().isoformat(),
        }).eq("id", proj["id"]).execute()

    dispute = db.table("disputes").insert({
        "milestone_id": milestone_id,
        "raised_by": employer_id,
        "dispute_type": "EMPLOYER_VETO",
        "arbitration_fee": arb_fee if razorpay_payment_id else 0,
        "ruling": "PENDING",
    }).execute().data[0]

    db.table("milestones").update({
        "status": "DISPUTE_ACTIVE",
        "updated_at": datetime.now().isoformat(),
    }).eq("id", milestone_id).execute()

    return {"dispute_id": dispute["id"], "arbitration_fee": arb_fee, "milestone_status": "DISPUTE_ACTIVE"}


def escalate_milestone(milestone_id: str, freelancer_id: str) -> dict:
    db = get_db()
    ms, proj = _get_milestone_with_project(milestone_id)

    if proj["freelancer_id"] != freelancer_id:
        raise ForbiddenError("Not assigned to this project")
    if ms["status"] != "AI_REJECTED":
        raise BadRequestError("Can only escalate AI_REJECTED milestones")

    # One escalation per milestone — block if a past FREELANCER_ESCALATION dispute exists
    prior = db.table("disputes").select("id, ruling").eq(
        "milestone_id", milestone_id
    ).eq("dispute_type", "FREELANCER_ESCALATION").execute().data
    if prior:
        raise ConflictError("You have already escalated this milestone — no further escalation allowed")

    dispute = db.table("disputes").insert({
        "milestone_id": milestone_id,
        "raised_by": freelancer_id,
        "dispute_type": "FREELANCER_ESCALATION",
        "arbitration_fee": 0,
        "ruling": "PENDING",
    }).execute().data[0]

    db.table("milestones").update({
        "status": "DISPUTE_ACTIVE",
        "updated_at": datetime.now().isoformat(),
    }).eq("id", milestone_id).execute()

    return {"dispute_id": dispute["id"], "milestone_status": "DISPUTE_ACTIVE"}


def request_extension(milestone_id: str, freelancer_id: str, new_deadline: str, reason: str) -> dict:
    db = get_db()
    ms, proj = _get_milestone_with_project(milestone_id)

    if proj["freelancer_id"] != freelancer_id:
        raise ForbiddenError("Not assigned to this project")
    if ms["status"] != "IN_PROGRESS":
        raise BadRequestError("Can only request extension for IN_PROGRESS milestones")
    if ms["extension_requested"]:
        raise ConflictError("Extension already requested")

    # Validate new deadline is at least 24h from now
    try:
        from milestones.decay import _parse_dt as _pdt
        new_dt = _pdt(new_deadline)
        min_deadline = datetime.now(new_dt.tzinfo) if new_dt.tzinfo else datetime.now()
        min_deadline = min_deadline + timedelta(hours=24)
        if new_dt < min_deadline:
            raise BadRequestError("New deadline must be at least 24 hours from now")
    except ValueError:
        raise BadRequestError("Invalid deadline format — use ISO 8601 (e.g. 2025-06-01T12:00:00Z)")

    db.table("milestones").update({
        "extension_requested": True,
        "extension_new_deadline": new_deadline,
        "extension_reason": reason,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", milestone_id).execute()

    return {"message": "Extension requested. Awaiting employer approval.", "milestone_id": milestone_id}


def approve_extension(milestone_id: str, employer_id: str) -> dict:
    db = get_db()
    ms, proj = _get_milestone_with_project(milestone_id)

    if proj["employer_id"] != employer_id:
        raise ForbiddenError("Not your project")
    if not ms["extension_requested"]:
        raise BadRequestError("No extension requested")

    db.table("milestones").update({
        "deadline": ms["extension_new_deadline"],
        "extension_requested": False,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", milestone_id).execute()

    return {"message": "Extension approved.", "new_deadline": ms["extension_new_deadline"]}


def deny_extension(milestone_id: str, employer_id: str) -> dict:
    db = get_db()
    ms, proj = _get_milestone_with_project(milestone_id)

    if proj["employer_id"] != employer_id:
        raise ForbiddenError("Not your project")
    if not ms["extension_requested"]:
        raise BadRequestError("No extension requested")

    db.table("milestones").update({
        "extension_requested": False,
        "extension_new_deadline": None,
        "extension_reason": None,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", milestone_id).execute()

    return {"message": "Extension denied. Original deadline stands."}


def get_decay(milestone_id: str, user_id: str) -> dict:
    db = get_db()
    ms, proj = _get_milestone_with_project(milestone_id)

    if proj["employer_id"] != user_id and proj["freelancer_id"] != user_id:
        raise ForbiddenError("Access denied")

    current_payout = calculate_current_payout(ms)
    from milestones.decay import _parse_dt
    deadline = _parse_dt(ms["deadline"])
    now = datetime.now(deadline.tzinfo) if deadline.tzinfo else datetime.now()
    is_late = now > deadline

    seconds_late = max(0, int((now - deadline).total_seconds())) if is_late else 0

    return {
        "milestone_id": milestone_id,
        "original_payout": ms["payout_amount"],
        "floor_payout": ms["payout_floor"],
        "current_payout": current_payout,
        "penalty_rate": ms["penalty_rate"],
        "deadline": ms["deadline"],
        "is_overdue": is_late,
        "hours_overdue": round(seconds_late / 3600, 2),
    }
