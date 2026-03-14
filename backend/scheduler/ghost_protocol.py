"""
Ghost Protocol: auto-triggered when a freelancer abandons a project
(deadline + GHOST_TRIGGER_SECONDS passed, no submission, no extension requested).
"""
from datetime import datetime
from database import get_db
from config import settings
from payments.banking import transfer_money, withdraw_from_escrow
from pfi.engine import get_fee_tier
import logging

logger = logging.getLogger(__name__)


def execute_ghost_protocol(project_id: str) -> dict:
    """Core ghost protocol execution. Called by scheduler or admin override."""
    db = get_db()
    now = datetime.now().isoformat()

    proj = db.table("projects").select("*").eq("id", project_id).single().execute().data
    if not proj:
        return {"error": "Project not found"}

    freelancer_id = proj.get("freelancer_id")
    employer_id = proj["employer_id"]

    # Refund all remaining escrow to employer
    escrow_held = proj.get("escrow_held") or 0
    if escrow_held > 0:
        pfi_score = 500
        if freelancer_id:
            pfi_data = db.table("users").select("pfi_score").eq("id", freelancer_id).single().execute().data
            pfi_score = pfi_data.get("pfi_score") or 500
        fee_rate = get_fee_tier(pfi_score)["fee_percent"] / 100
        platform_fee = int(escrow_held * fee_rate)
        refund_amount = escrow_held - platform_fee

        if refund_amount > 0:
            transfer_money(settings.PLATFORM_ESCROW_USER_ID, employer_id, refund_amount)
        if platform_fee > 0:
            withdraw_from_escrow(platform_fee)

    # Nuke all remaining milestones
    milestones = db.table("milestones").select("*").eq("project_id", project_id).not_.in_(
        "status", ["COMPLETED_PAID", "REFUNDED_PENALIZED"]
    ).execute().data

    milestone_ids = [m["id"] for m in milestones]
    if milestone_ids:
        db.table("milestones").update({
            "status": "REFUNDED_PENALIZED",
            "final_payout": 0,
            "updated_at": now,
        }).in_("id", milestone_ids).execute()

    # Nuke project status
    db.table("projects").update({
        "status": "CANCELLED",
        "escrow_held": 0,
        "updated_at": now,
    }).eq("id", project_id).execute()

    # Freelancer PFI → 300 (nuclear) + increment abandoned_projects
    if freelancer_id:
        user_data = db.table("users").select("abandoned_projects").eq("id", freelancer_id).single().execute().data
        abandoned = (user_data.get("abandoned_projects") or 0) + 1 if user_data else 1
        db.table("users").update({
            "pfi_score": 300,
            "abandoned_projects": abandoned,
            "updated_at": now,
        }).eq("id", freelancer_id).execute()

    # Auto-relist: create new OPEN project with remaining milestones
    # so employer can re-hire a different freelancer
    new_project_id = None
    if milestones:
        from datetime import timedelta

        # Normalize weights so remaining milestones sum to 100%
        raw_total = sum(ms.get("weight_percentage", 0) for ms in milestones)
        scale = 100.0 / raw_total if raw_total > 0 else 1.0

        new_proj = db.table("projects").insert({
            "employer_id": employer_id,
            "freelancer_id": None,
            "title": f"{proj['title']} (Re-listed)",
            "raw_requirement": proj.get("raw_requirement", ""),
            "project_summary": proj.get("project_summary", ""),
            "category": proj.get("category", "WRITING"),
            "total_budget": proj.get("total_budget", 0),
            "milestone_pool": proj.get("milestone_pool", 0),
            "success_fee": proj.get("success_fee", 0),
            "status": "OPEN",
            "escrow_held": 0,
            "created_at": now,
            "updated_at": now,
        }).execute().data[0]
        new_project_id = new_proj["id"]

        # Copy remaining milestones with renumbered sequences and normalized weights
        now_dt = datetime.now()
        for i, ms in enumerate(milestones):
            new_weight = round(ms.get("weight_percentage", 0) * scale, 1)
            deadline_days = (i + 1) * 3  # 3-day intervals from now
            db.table("milestones").insert({
                "project_id": new_project_id,
                "sequence_number": i + 1,
                "title": ms["title"],
                "description": ms["description"],
                "ai_success_criteria": ms["ai_success_criteria"],
                "weight_percentage": new_weight,
                "payout_amount": 0,
                "payout_floor": 0,
                "penalty_rate": 0,
                "deadline": (now_dt + timedelta(days=deadline_days)).isoformat(),
                "status": "LOCKED",
                "created_at": now,
                "updated_at": now,
            }).execute()

        logger.info(f"Auto-relisted {len(milestones)} milestones as new project {new_project_id}")

    logger.warning(f"GHOST PROTOCOL executed for project {project_id}")

    return {
        "ghost_protocol": "executed",
        "project_id": project_id,
        "milestones_nuked": len(milestone_ids),
        "escrow_refunded": escrow_held,
        "freelancer_pfi": 300 if freelancer_id else "N/A",
        "relisted_project_id": new_project_id,
    }


def check_ghost_protocol():
    """
    APScheduler job. Runs on SCHEDULER_GHOST_INTERVAL_SECONDS.
    Finds all IN_PROGRESS milestones past (deadline + GHOST_TRIGGER_SECONDS)
    with no extension requested, and triggers ghost protocol on those projects.
    """
    db = get_db()
    now = datetime.now()

    try:
        # Fetch all IN_PROGRESS milestones
        milestones = db.table("milestones").select(
            "id, project_id, deadline, extension_requested"
        ).eq("status", "IN_PROGRESS").execute().data

        ghosted_projects = set()

        for ms in milestones:
            if ms.get("extension_requested"):
                continue

            deadline_str = ms.get("deadline")
            if not deadline_str:
                continue

            try:
                if isinstance(deadline_str, datetime):
                    deadline = deadline_str.replace(tzinfo=None)
                else:
                    deadline = datetime.fromisoformat(str(deadline_str).replace("Z", "").replace("+00:00", ""))
                elapsed = (now - deadline).total_seconds()
            except (ValueError, TypeError):
                continue

            if elapsed >= settings.GHOST_TRIGGER_SECONDS:
                project_id = ms["project_id"]
                if project_id not in ghosted_projects:
                    ghosted_projects.add(project_id)
                    logger.info(f"Ghost protocol triggered for project {project_id}")
                    execute_ghost_protocol(project_id)

    except Exception as e:
        logger.error(f"Ghost protocol check failed: {e}")
