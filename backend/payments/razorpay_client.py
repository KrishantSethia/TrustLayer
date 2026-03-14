import razorpay
from config import settings

_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(amount_paise: int, receipt: str) -> dict:
    """Creates a Razorpay order. amount_paise is in paise (BIGINT from DB)."""
    return _client.order.create({
        "amount": amount_paise,      # Razorpay expects paise directly
        "currency": "INR",
        "receipt": receipt,
    })


def create_refund(payment_id: str, amount_paise: int) -> dict:
    """Partial or full refund against a payment. amount in paise."""
    return _client.payment.refund(payment_id, {
        "amount": amount_paise,
    })


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    try:
        _client.utility.verify_webhook_signature(
            body.decode(),
            signature,
            settings.RAZORPAY_WEBHOOK_SECRET,
        )
        return True
    except Exception:
        return False
