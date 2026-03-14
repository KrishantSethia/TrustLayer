from database import get_db

PFI_FLOOR = 300
PFI_CEILING = 850

# (lo, hi, tier_name, fee_percent)
PFI_TIERS = [
    (800, 850, "God-Tier",      0),
    (650, 799, "Proven Pro",    5),
    (500, 649, "Standard/New", 10),
    (300, 499, "High Risk",    15),
]

# PFI delta constants
DELTA_Q_FIRST_TRY = 15    # AI approved on first submission
DELTA_Q_LATER_TRY = 5     # AI approved on 2nd+ submission
DELTA_Q_REJECTED  = -5    # AI UNMET
DELTA_Q_PARTIAL   = 0     # AI PARTIALLY_MET (no quality delta)

DELTA_T_EARLY  = 10       # submitted 24h+ before deadline
DELTA_T_ONTIME = 0        # on time
DELTA_T_LATE   = -15      # missed deadline

P_ARB_EMPLOYER_WON = 75   # employer won dispute
P_ARB_ESCALATION_LOST = 10  # freelancer escalated and lost (AI was right)
P_ARB_GHOST = 200         # ghost protocol — floors at 300


def get_fee_tier(pfi_score: int) -> dict:
    for lo, hi, name, fee in PFI_TIERS:
        if lo <= pfi_score <= hi:
            return {"tier": name, "fee_percent": fee, "pfi_score": pfi_score}
    return {"tier": "High Risk", "fee_percent": 15, "pfi_score": pfi_score}


def update_pfi(
    freelancer_id: str,
    quality_delta: int,
    time_delta: int,
    arbitration_penalty: int,
) -> int:
    """Applies PFI delta and persists to DB. Returns new score."""
    db = get_db()
    result = db.table("users").select("pfi_score").eq("id", freelancer_id).single().execute()
    old_score = result.data["pfi_score"] or 500

    new_score = max(
        PFI_FLOOR,
        min(PFI_CEILING, old_score + quality_delta + time_delta - arbitration_penalty)
    )

    db.table("users").update({"pfi_score": new_score}).eq("id", freelancer_id).execute()
    return new_score
