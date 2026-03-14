from fastapi import APIRouter, Depends
from auth.dependencies import require_freelancer, require_employer, require_any
from milestones.schemas import SubmitRequest, ExtensionRequest, VetoConfirmRequest
from milestones import service

router = APIRouter()


@router.post("/milestones/{milestone_id}/submit")
async def submit(milestone_id: str, body: SubmitRequest, freelancer: dict = Depends(require_freelancer)):
    return await service.submit_milestone(milestone_id, freelancer["id"], body.deliverable_text)


@router.get("/milestones/{milestone_id}/decay")
def get_decay(milestone_id: str, user: dict = Depends(require_any)):
    return service.get_decay(milestone_id, user["id"])


@router.post("/milestones/{milestone_id}/veto")
def veto(milestone_id: str, employer: dict = Depends(require_employer)):
    """Step 1: returns Razorpay order for arb fee. Frontend opens checkout."""
    return service.veto_milestone(milestone_id, employer["id"])


@router.post("/milestones/{milestone_id}/veto-confirm")
def veto_confirm(milestone_id: str, body: VetoConfirmRequest, employer: dict = Depends(require_employer)):
    """Step 2: called after Razorpay payment success. Creates dispute."""
    return service.confirm_veto(milestone_id, employer["id"], body.razorpay_payment_id)


@router.post("/milestones/{milestone_id}/escalate")
def escalate(milestone_id: str, freelancer: dict = Depends(require_freelancer)):
    return service.escalate_milestone(milestone_id, freelancer["id"])


@router.post("/milestones/{milestone_id}/request-extension")
def request_extension(milestone_id: str, body: ExtensionRequest, freelancer: dict = Depends(require_freelancer)):
    return service.request_extension(milestone_id, freelancer["id"], body.new_deadline, body.reason)


@router.post("/milestones/{milestone_id}/approve-extension")
def approve_extension(milestone_id: str, employer: dict = Depends(require_employer)):
    return service.approve_extension(milestone_id, employer["id"])


@router.post("/milestones/{milestone_id}/deny-extension")
def deny_extension(milestone_id: str, employer: dict = Depends(require_employer)):
    return service.deny_extension(milestone_id, employer["id"])
