from datetime import datetime
from database import get_db
from exceptions import NotFoundError, ForbiddenError, BadRequestError, ConflictError


def create_bid(freelancer_id: str, project_id: str, proposed_rate: int, message: str) -> dict:
    db = get_db()

    proj = db.table("projects").select("*").eq("id", project_id).single().execute().data
    if not proj:
        raise NotFoundError("Project")
    if proj["status"] != "OPEN":
        raise BadRequestError(f"Project is not open for bids (status: {proj['status']})")
    if proj["freelancer_id"]:
        raise ConflictError("Project already has an assigned freelancer")

    # Check for existing bid
    existing = db.table("bids").select("id").eq("project_id", project_id).eq(
        "freelancer_id", freelancer_id
    ).execute().data
    if existing:
        raise ConflictError("You already placed a bid on this project")

    bid = db.table("bids").insert({
        "project_id": project_id,
        "freelancer_id": freelancer_id,
        "proposed_rate": proposed_rate,
        "message": message,
        "status": "PENDING",
        "created_at": datetime.now().isoformat(),
    }).execute().data[0]

    return bid


def get_bids_for_project(project_id: str, employer_id: str) -> list:
    db = get_db()

    proj = db.table("projects").select("employer_id").eq("id", project_id).single().execute().data
    if not proj:
        raise NotFoundError("Project")
    if proj["employer_id"] != employer_id:
        raise ForbiddenError("Not your project")

    bids = db.table("bids").select("*").eq("project_id", project_id).order("created_at").execute().data or []

    # Enrich each bid with freelancer info
    freelancer_ids = list({b["freelancer_id"] for b in bids if b.get("freelancer_id")})
    if freelancer_ids:
        users = db.table("users").select("id, name, pfi_score").in_("id", freelancer_ids).execute().data or []
        user_map = {u["id"]: u for u in users}
        for bid in bids:
            bid["freelancer"] = user_map.get(bid["freelancer_id"])

    return bids


def accept_bid(bid_id: str, employer_id: str) -> dict:
    """Step 1: Employer selects a bid — creates a Razorpay order (or skips in DEMO_MODE)."""
    from config import settings
    db = get_db()

    bid = db.table("bids").select("*").eq("id", bid_id).single().execute().data
    if not bid:
        raise NotFoundError("Bid")
    if bid["status"] != "PENDING":
        raise BadRequestError(f"Bid is not pending (status: {bid['status']})")

    proj = db.table("projects").select("*").eq("id", bid["project_id"]).single().execute().data
    if not proj:
        raise NotFoundError("Project")
    if proj["employer_id"] != employer_id:
        raise ForbiddenError("Not your project")
    if proj["status"] != "OPEN":
        raise BadRequestError(f"Project must be OPEN to accept a bid (status: {proj['status']})")
    if proj["freelancer_id"]:
        raise ConflictError("Project already has a freelancer assigned")

    amount_paise = int(bid["proposed_rate"])

    # Only skip Razorpay if keys are missing
    if not settings.RAZORPAY_KEY_ID:
        result = confirm_bid_payment(bid_id, employer_id, f"demo_{bid_id[:8]}")
        return {"step": "demo_complete", **result}

    from payments.razorpay_client import create_order
    order = create_order(amount_paise=amount_paise, receipt=f"bid_{bid_id[:8]}")

    return {
        "step": "payment_required",
        "razorpay_order_id": order["id"],
        "razorpay_key_id": settings.RAZORPAY_KEY_ID,
        "amount": amount_paise,
        "currency": "INR",
        "bid_id": bid_id,
        "project_id": proj["id"],
        "freelancer_name": bid.get("freelancer_name", ""),
    }


def confirm_bid_payment(bid_id: str, employer_id: str, razorpay_payment_id: str) -> dict:
    """Step 2: Payment confirmed — lock funds, assign freelancer, start project."""
    from payments.banking import deposit_to_escrow
    from config import settings
    db = get_db()

    bid = db.table("bids").select("*").eq("id", bid_id).single().execute().data
    if not bid:
        raise NotFoundError("Bid")
    if bid["status"] != "PENDING":
        raise BadRequestError("Bid already processed")

    proj = db.table("projects").select("*").eq("id", bid["project_id"]).single().execute().data
    if not proj:
        raise NotFoundError("Project")
    if proj["employer_id"] != employer_id:
        raise ForbiddenError("Not your project")
    if proj["status"] != "OPEN":
        raise BadRequestError("Project is no longer open")

    agreed_amount = int(bid["proposed_rate"])
    milestone_pool = agreed_amount // 2
    success_fee = agreed_amount - milestone_pool
    now = datetime.now().isoformat()

    # Update project with agreed budget and lock funds
    deposit_to_escrow(agreed_amount)
    db.table("projects").update({
        "total_budget": agreed_amount,
        "milestone_pool": milestone_pool,
        "success_fee": success_fee,
        "escrow_held": agreed_amount,
        "razorpay_payment_id": razorpay_payment_id,
        "freelancer_id": bid["freelancer_id"],
        "status": "IN_PROGRESS",
        "updated_at": now,
    }).eq("id", proj["id"]).execute()

    # Recalculate milestone payouts based on agreed amount
    milestones = db.table("milestones").select("*").eq("project_id", proj["id"]).order("sequence_number").execute().data or []
    first_ms_id = None
    for i, ms in enumerate(milestones):
        payout_amount = int((ms["weight_percentage"] / 100) * milestone_pool)
        payout_floor = payout_amount // 2
        if settings.DEMO_MODE:
            penalty_rate = payout_amount / 300
        else:
            penalty_rate = payout_amount / 50

        new_status = "IN_PROGRESS" if i == 0 else "LOCKED"
        if i == 0:
            first_ms_id = ms["id"]

        db.table("milestones").update({
            "payout_amount": payout_amount,
            "payout_floor": payout_floor,
            "penalty_rate": penalty_rate,
            "status": new_status,
            "updated_at": now,
        }).eq("id", ms["id"]).execute()

    # Accept this bid, reject all others
    db.table("bids").update({"status": "ACCEPTED", "updated_at": now}).eq("id", bid_id).execute()
    db.table("bids").update({"status": "REJECTED", "updated_at": now}).eq("project_id", proj["id"]).neq("id", bid_id).execute()

    return {
        "message": "Bid accepted. Project is now IN_PROGRESS.",
        "project_id": proj["id"],
        "freelancer_id": bid["freelancer_id"],
        "first_milestone_id": first_ms_id,
    }
