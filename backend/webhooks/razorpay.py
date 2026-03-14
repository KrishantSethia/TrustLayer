import hashlib
import hmac
import json
from fastapi import APIRouter, Request, HTTPException
from database import get_db
from config import settings

router = APIRouter()


def _verify_signature(body: bytes, signature: str) -> bool:
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not _verify_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = json.loads(body)
    event = payload.get("event")

    if event == "payment.captured":
        await _handle_payment_captured(payload)
    elif event == "payment.failed":
        await _handle_payment_failed(payload)

    return {"status": "ok"}


async def _handle_payment_captured(payload: dict):
    from projects.service import activate_project_after_payment
    db = get_db()
    payment = payload["payload"]["payment"]["entity"]
    razorpay_payment_id = payment["id"]
    razorpay_order_id = payment.get("order_id")

    if not razorpay_order_id:
        return

    proj = db.table("projects").select("id, status").eq(
        "razorpay_order_id", razorpay_order_id
    ).single().execute().data

    if not proj:
        return  # Unknown order

    if proj["status"] != "FUNDED":
        return  # Already activated or wrong state

    activate_project_after_payment(proj["id"], razorpay_payment_id)


async def _handle_payment_failed(payload: dict):
    from datetime import datetime
    db = get_db()
    payment = payload["payload"]["payment"]["entity"]
    razorpay_order_id = payment.get("order_id")

    if not razorpay_order_id:
        return

    proj = db.table("projects").select("id, status").eq(
        "razorpay_order_id", razorpay_order_id
    ).single().execute().data

    if not proj or proj["status"] not in ("DRAFT", "FUNDED"):
        return

    db.table("projects").update({
        "status": "CANCELLED",
        "updated_at": datetime.now().isoformat(),
    }).eq("id", proj["id"]).execute()
