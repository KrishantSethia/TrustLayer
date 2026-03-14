from fastapi import APIRouter, Depends
from auth.dependencies import require_freelancer, require_employer
from bids.schemas import BidCreateRequest
from bids import service

router = APIRouter()


@router.post("/bids")
def create_bid(body: BidCreateRequest, freelancer: dict = Depends(require_freelancer)):
    return service.create_bid(
        freelancer["id"], body.project_id, body.proposed_rate, body.message
    )


@router.get("/projects/{project_id}/bids")
def get_bids(project_id: str, employer: dict = Depends(require_employer)):
    return service.get_bids_for_project(project_id, employer["id"])


@router.post("/bids/{bid_id}/accept")
def accept_bid(bid_id: str, employer: dict = Depends(require_employer)):
    return service.accept_bid(bid_id, employer["id"])


@router.post("/bids/{bid_id}/confirm-payment")
def confirm_bid_payment(bid_id: str, body: dict, employer: dict = Depends(require_employer)):
    return service.confirm_bid_payment(
        bid_id, employer["id"],
        body.get("razorpay_payment_id", f"direct_{bid_id[:8]}"),
    )
