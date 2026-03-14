from config import settings
from payments.banking_rpc import (
    _rpc_deposit_money,
    _rpc_withdraw_money,
    _rpc_transfer_money,
    _rpc_get_balance,
    _rpc_get_transactions,
)


def deposit_to_escrow(amount: int) -> None:
    """
    Credits the platform escrow account.
    Called when Razorpay confirms payment — escrow receives the funds.
    Amount in paise (BIGINT).
    """
    _rpc_deposit_money(settings.PLATFORM_ESCROW_USER_ID, amount)


def transfer_money(from_user: str, to_user: str, amount: int) -> None:
    """
    Move funds between internal accounts.
    Amount in paise (BIGINT).
    """
    _rpc_transfer_money(sender=from_user, receiver=to_user, amount=amount)


def withdraw_from_escrow(amount: int) -> None:
    """
    Debit from platform escrow (e.g. after Razorpay refund / platform fee).
    Amount in paise (BIGINT).
    """
    _rpc_withdraw_money(settings.PLATFORM_ESCROW_USER_ID, amount)


def withdraw_money(user_id: str, amount: int) -> None:
    """
    Debit from any user account.
    Amount in paise (BIGINT).
    """
    _rpc_withdraw_money(user_id, amount)


def get_balance(user_id: str) -> int:
    """Returns account balance in paise."""
    return _rpc_get_balance(user_id)


def get_transactions(user_id: str, limit: int = 50) -> list:
    """Returns transaction history."""
    rows = _rpc_get_transactions(user_id)
    return rows[:limit] if limit else rows
