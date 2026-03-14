from fastapi import APIRouter, Depends, Query
from auth.dependencies import require_employer, require_freelancer, require_any
from projects.schemas import DecomposeRequest, ProjectCreateRequest
from projects import service

router = APIRouter()


@router.post("/projects/decompose")
async def decompose(body: DecomposeRequest, employer: dict = Depends(require_employer)):
    return await service.decompose_project(body.raw_requirement, body.category, body.total_duration_days, body.source_text)


@router.post("/projects/create")
def create_project(body: ProjectCreateRequest, employer: dict = Depends(require_employer)):
    return service.create_project(employer["id"], body.model_dump())


@router.post("/projects/{project_id}/fund")
def fund_project(project_id: str, employer: dict = Depends(require_employer)):
    return service.fund_project(project_id, employer["id"])


@router.post("/projects/{project_id}/confirm-payment")
def confirm_payment(project_id: str, body: dict, employer: dict = Depends(require_employer)):
    """Called by frontend after Razorpay payment success (fallback when webhook doesn't fire)."""
    return service.activate_project_after_payment(
        project_id,
        body.get("razorpay_payment_id", f"direct_{project_id[:8]}"),
    )


@router.get("/projects/{project_id}")
def get_project(project_id: str, user: dict = Depends(require_any)):
    return service.get_project(project_id, user["id"])


@router.get("/marketplace/{project_id}")
def marketplace_project(project_id: str, freelancer: dict = Depends(require_freelancer)):
    return service.get_marketplace_project(project_id, freelancer["id"])


@router.get("/marketplace")
def marketplace(
    category: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    freelancer: dict = Depends(require_freelancer),
):
    return service.get_marketplace(category, page, limit)


@router.get("/employer/projects")
def employer_projects(
    status: str = Query(None),
    employer: dict = Depends(require_employer),
):
    return service.get_employer_projects(employer["id"], status)


@router.post("/projects/{project_id}/cancel")
def cancel_project(project_id: str, employer: dict = Depends(require_employer)):
    return service.cancel_project(project_id, employer["id"])
