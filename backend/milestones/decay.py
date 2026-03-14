from datetime import datetime
from config import settings


def _parse_dt(value) -> datetime:
    """Accept either a datetime object (from psycopg2) or an ISO string."""
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def calculate_current_payout(milestone: dict) -> int:
    """
    Returns the current decayed payout amount in paise.
    penalty_rate: paise/hr (PROD) or paise/sec (DEMO).
    """
    payout_amount = milestone["payout_amount"] or 0
    payout_floor  = milestone["payout_floor"] or 0
    penalty_rate  = milestone["penalty_rate"] or 0

    deadline = _parse_dt(milestone["deadline"])
    now = datetime.now(deadline.tzinfo) if deadline.tzinfo else datetime.now()

    if now <= deadline:
        return payout_amount  # not yet late

    if settings.DEMO_MODE:
        elapsed = (now - deadline).total_seconds()        # per-second
    else:
        elapsed = (now - deadline).total_seconds() / 3600  # per-hour

    decayed = payout_amount - (penalty_rate * elapsed)
    return max(int(payout_floor), int(decayed))


def calculate_time_delta(milestone: dict) -> int:
    """Returns PFI time_delta based on submission vs deadline."""
    from datetime import timedelta
    deadline = _parse_dt(milestone["deadline"])
    now = datetime.now(deadline.tzinfo) if deadline.tzinfo else datetime.now()

    if now > deadline:
        return -15  # late
    elif deadline - now >= timedelta(hours=24):
        return 10   # early (24h+ remaining)
    return 0        # on time
