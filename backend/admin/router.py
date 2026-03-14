from fastapi import APIRouter, Depends, Query
from auth.dependencies import require_admin
from admin import service

router = APIRouter()


@router.get("/admin/users")
def admin_users(role: str = Query(None), admin: dict = Depends(require_admin)):
    return service.get_all_users(role)


@router.get("/admin/projects")
def admin_projects(status: str = Query(None), admin: dict = Depends(require_admin)):
    return service.get_all_projects(status)


@router.post("/admin/pfi/{freelancer_id}/adjust")
def adjust_pfi(
    freelancer_id: str,
    delta: int = Query(..., description="Points to add (negative to subtract)"),
    reason: str = Query(default="Manual admin adjustment"),
    admin: dict = Depends(require_admin),
):
    return service.adjust_pfi(freelancer_id, delta, reason)


@router.post("/admin/projects/{project_id}/ghost")
def ghost_protocol(project_id: str, admin: dict = Depends(require_admin)):
    return service.ghost_protocol_manual(project_id)


@router.post("/admin/bootstrap")
def bootstrap():
    """One-time setup: creates admin user + seeds demo data. No auth required. Fails if admin already exists."""
    return service.bootstrap()


@router.post("/admin/demo/seed")
def seed_demo(admin: dict = Depends(require_admin)):
    return service.seed_demo()


@router.post("/admin/demo/reset")
def reset_demo(admin: dict = Depends(require_admin)):
    return service.reset_demo()


# ─── Demo Helpers ─────────────────────────────────────────────────────────────

@router.post("/admin/projects/{project_id}/simulate-payment")
def simulate_payment(project_id: str, admin: dict = Depends(require_admin)):
    return service.simulate_payment(project_id)


@router.post("/admin/demo/fast-forward-timer")
def fast_forward_timer(milestone_id: str = Query(...), admin: dict = Depends(require_admin)):
    return service.fast_forward_timer(milestone_id)


@router.post("/admin/demo/fast-forward-approval")
def fast_forward_approval(milestone_id: str = Query(...), admin: dict = Depends(require_admin)):
    return service.fast_forward_approval(milestone_id)


@router.post("/admin/demo/set-pfi")
def set_pfi(user_id: str = Query(...), score: int = Query(...), admin: dict = Depends(require_admin)):
    return service.set_pfi(user_id, score)


@router.post("/admin/milestones/{milestone_id}/force-complete")
def force_complete(
    milestone_id: str,
    reason: str = Query(default="Admin override"),
    admin: dict = Depends(require_admin),
):
    return service.force_complete_milestone(milestone_id, reason)


@router.post("/admin/demo/fast-forward-deadline")
def fast_forward_deadline(milestone_id: str = Query(...), admin: dict = Depends(require_admin)):
    return service.fast_forward_deadline(milestone_id)


@router.post("/admin/demo/create-dispute")
def create_dispute(
    milestone_id: str = Query(...),
    dispute_type: str = Query(..., description="EMPLOYER_VETO or FREELANCER_ESCALATION"),
    admin: dict = Depends(require_admin),
):
    return service.create_demo_dispute(milestone_id, dispute_type)


@router.get("/admin/ghost-at-risk")
def ghost_at_risk(admin: dict = Depends(require_admin)):
    return service.get_ghost_at_risk()


@router.get("/admin/stats")
def platform_stats(admin: dict = Depends(require_admin)):
    return service.get_platform_stats()
