from database import get_db
from exceptions import NotFoundError, ForbiddenError
from pfi.engine import get_fee_tier, PFI_TIERS
from payments.banking import get_balance, get_transactions


def get_pfi(user_id: str, requesting_user_id: str) -> dict:
    db = get_db()

    # Anyone can view PFI of another user (public-ish info for marketplace)
    user = db.table("users").select(
        "id, name, pfi_score, role"
    ).eq("id", user_id).single().execute().data
    if not user:
        raise NotFoundError("User")

    pfi_score = user.get("pfi_score") or 500
    tier = get_fee_tier(pfi_score)

    # Find the next tier above current score
    next_tier = None
    delta_to_next_tier = None
    for lo, hi, name, fee in sorted(PFI_TIERS, key=lambda t: t[0]):
        if lo > pfi_score:
            next_tier = {"tier": name, "fee_percent": fee, "min_score": lo}
            delta_to_next_tier = lo - pfi_score
            break

    return {
        "user_id": user_id,
        "name": user["name"],
        "pfi_score": pfi_score,
        "tier": tier,
        "next_tier": next_tier,
        "delta_to_next_tier": delta_to_next_tier,
    }


def _compute_escrow_pending(user_id: str) -> int:
    """Compute earnings frozen in escrow — only milestones that passed AI review but await project completion."""
    db = get_db()
    active_projects = db.table("projects").select("id").eq(
        "freelancer_id", user_id
    ).in_("status", ["IN_PROGRESS", "FUNDED"]).execute().data
    if not active_projects:
        return 0
    project_ids = [p["id"] for p in active_projects]
    milestones = db.table("milestones").select("final_payout").in_(
        "project_id", project_ids
    ).eq("status", "COMPLETED_PAID").execute().data
    return sum(m.get("final_payout") or 0 for m in milestones)


def get_wallet(user_id: str, requesting_user_id: str) -> dict:
    if user_id != requesting_user_id:
        # Only admins can view others' wallets — enforced at router level
        raise ForbiddenError("Cannot view another user's wallet")

    db = get_db()
    user = db.table("users").select("id, name, role").eq(
        "id", user_id
    ).single().execute().data
    if not user:
        raise NotFoundError("User")

    balance = get_balance(user_id)
    recent_txns = get_transactions(user_id, limit=10)
    escrow_pending = _compute_escrow_pending(user_id) if user.get("role") == "FREELANCER" else 0

    return {
        "user_id": user_id,
        "available_balance": balance,
        "escrow_pending": escrow_pending,
        "recent_transactions": recent_txns,
    }


def get_freelancer_dashboard(freelancer_id: str) -> dict:
    db = get_db()

    user = db.table("users").select(
        "id, name, pfi_score"
    ).eq("id", freelancer_id).single().execute().data
    if not user:
        raise NotFoundError("User")

    pfi_score = user.get("pfi_score") or 500
    tier = get_fee_tier(pfi_score)
    balance = get_balance(freelancer_id)
    escrow_pending = _compute_escrow_pending(freelancer_id)

    # Active projects
    active_projects = db.table("projects").select(
        "id, title, status, category, employer_id"
    ).eq("freelancer_id", freelancer_id).in_(
        "status", ["IN_PROGRESS", "FUNDED"]
    ).execute().data

    # Current milestones
    active_milestones = []
    if active_projects:
        project_ids = [p["id"] for p in active_projects]
        active_milestones = db.table("milestones").select("*").in_(
            "project_id", project_ids
        ).in_("status", ["IN_PROGRESS", "AI_EVALUATING", "AI_REJECTED", "AI_APPROVED_PENDING"]).execute().data

    # Pending bids
    pending_bids = db.table("bids").select(
        "id, project_id, proposed_rate, status, created_at, projects(title, status)"
    ).eq("freelancer_id", freelancer_id).eq("status", "PENDING").execute().data

    return {
        "user": {
            "id": user["id"],
            "name": user["name"],
            "pfi_score": pfi_score,
            "tier": tier,
            "available_balance": balance,
            "escrow_pending": escrow_pending,
        },
        "active_projects": active_projects,
        "active_milestones": active_milestones,
        "pending_bids": pending_bids,
    }


def get_employer_dashboard(employer_id: str) -> dict:
    db = get_db()

    user = db.table("users").select(
        "id, name, employer_trust_score"
    ).eq("id", employer_id).single().execute().data
    if not user:
        raise NotFoundError("User")

    balance = get_balance(employer_id)

    # All projects
    projects = db.table("projects").select(
        "id, title, status, category, total_budget, escrow_held, freelancer_id, created_at"
    ).eq("employer_id", employer_id).order("created_at", desc=True).execute().data

    # Active milestones needing attention (AI_APPROVED_PENDING — can veto)
    pending_approval = []
    if projects:
        project_ids = [p["id"] for p in projects]
        pending_approval = db.table("milestones").select(
            "id, title, project_id, status, auto_release_at, payout_amount"
        ).in_("project_id", project_ids).eq("status", "AI_APPROVED_PENDING").execute().data

    # Extension requests pending employer decision
    extension_requests = db.table("milestones").select(
        "id, title, project_id, deadline, extension_new_deadline, extension_reason"
    ).in_("project_id", [p["id"] for p in projects] if projects else []).eq(
        "extension_requested", True
    ).execute().data

    return {
        "user": {
            "id": user["id"],
            "name": user["name"],
            "employer_trust_score": user.get("employer_trust_score") or 500,
            "available_balance": balance,
        },
        "projects": projects,
        "pending_approval": pending_approval,
        "extension_requests": extension_requests,
    }


def get_freelancer_projects(freelancer_id: str) -> list:
    """Returns all projects the freelancer is assigned to."""
    db = get_db()
    projects = db.table("projects").select(
        "id, title, status, category, total_budget, milestone_pool, escrow_held, employer_id, created_at, "
        "users!projects_employer_id_fkey(name)"
    ).eq("freelancer_id", freelancer_id).order("created_at", desc=True).execute().data

    for proj in projects:
        # Get current active milestone
        ms = db.table("milestones").select(
            "id, title, status, deadline"
        ).eq("project_id", proj["id"]).not_.in_(
            "status", ["COMPLETED_PAID", "REFUNDED_PENALIZED", "LOCKED"]
        ).order("sequence_number").limit(1).execute().data
        proj["current_milestone"] = ms[0] if ms else None
        # Frozen = completed milestones' final_payout (held in escrow until project completes)
        completed = db.table("milestones").select("final_payout").eq(
            "project_id", proj["id"]
        ).eq("status", "COMPLETED_PAID").execute().data
        proj["frozen_earnings"] = sum(m.get("final_payout") or 0 for m in completed)
        # Potential = remaining milestone payouts + success fee
        proj["potential_earnings"] = (proj.get("milestone_pool") or 0) - proj["frozen_earnings"] + (proj.get("success_fee") or 0)
        employer_join = proj.pop("users!projects_employer_id_fkey", None)
        proj["employer_name"] = employer_join["name"] if employer_join else "Unknown"

    return projects


def get_employer_projects_list(employer_id: str) -> list:
    """Returns all projects for the employer."""
    db = get_db()
    return db.table("projects").select(
        "id, title, status, category, total_budget, escrow_held, freelancer_id, created_at"
    ).eq("employer_id", employer_id).order("created_at", desc=True).execute().data
