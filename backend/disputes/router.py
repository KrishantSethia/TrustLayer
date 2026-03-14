from fastapi import APIRouter, Depends
from auth.dependencies import require_admin, require_any
from disputes.schemas import RuleRequest
from disputes import service

router = APIRouter()


@router.get("/disputes")
def list_disputes(ruling: str = None, admin: dict = Depends(require_admin)):
    return service.list_disputes(ruling)


@router.get("/disputes/{dispute_id}")
def get_dispute(dispute_id: str, user: dict = Depends(require_any)):
    return service.get_dispute(dispute_id)


@router.post("/disputes/{dispute_id}/rule")
def rule_dispute(dispute_id: str, body: RuleRequest, admin: dict = Depends(require_admin)):
    return service.rule_dispute(dispute_id, body.ruling, body.admin_notes)
