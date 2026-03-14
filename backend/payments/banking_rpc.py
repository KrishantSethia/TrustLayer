"""
Python implementations of the banking RPC functions previously in PostgreSQL.
All amounts are in paise (BIGINT). 100 paise = 1 INR.
"""
import psycopg2.extras
from database import _cursor
import uuid


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_account_id(user_id: str) -> str | None:
    cur = _cursor()
    cur.execute('SELECT id FROM accounts WHERE user_id = %s', [user_id])
    row = cur.fetchone()
    return str(row["id"]) if row else None


def _get_account_id_and_balance(user_id: str) -> tuple[str | None, int]:
    cur = _cursor()
    cur.execute('SELECT id, balance FROM accounts WHERE user_id = %s', [user_id])
    row = cur.fetchone()
    if not row:
        return None, 0
    return str(row["id"]), int(row["balance"])


# ─────────────────────────────────────────────────────────────────────────────
# RPC Functions (called via rpc("fn_name", params))
# ─────────────────────────────────────────────────────────────────────────────

def _rpc_create_user(p_name: str, p_email: str, p_phone: int = 0, p_account_type: str = "personal") -> str:
    """
    Creates a user + account row. Returns the new user UUID as a string.
    """
    cur = _cursor()
    user_id = str(uuid.uuid4())
    cur.execute(
        'INSERT INTO users (id, name, email, phone, account_type) '
        'VALUES (%s, %s, %s, %s, %s) '
        'ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [user_id, p_name, p_email, p_phone, p_account_type]
    )
    row = cur.fetchone()
    actual_id = str(row["id"])

    # Create account if not exists
    cur.execute(
        'INSERT INTO accounts (user_id, balance, account_type) VALUES (%s, 0, %s) '
        'ON CONFLICT (user_id) DO NOTHING',
        [actual_id, p_account_type]
    )
    return actual_id


def _rpc_deposit_money(p_user_id: str, p_amount: int) -> bool:
    """Credits p_amount paise to p_user_id's account."""
    if p_amount <= 0:
        raise ValueError("Deposit amount must be positive")

    account_id, balance = _get_account_id_and_balance(p_user_id)
    if not account_id:
        raise ValueError(f"Account not found for user {p_user_id}")

    cur = _cursor()
    cur.execute(
        'UPDATE accounts SET balance = balance + %s, updated_at = NOW() WHERE user_id = %s',
        [p_amount, p_user_id]
    )
    cur.execute(
        'INSERT INTO transactions (to_account, amount, type, notes) VALUES (%s, %s, %s, %s)',
        [account_id, p_amount, "deposit", "deposit"]
    )
    return True


def _rpc_withdraw_money(p_user_id: str, p_amount: int) -> bool:
    """Debits p_amount paise from p_user_id's account."""
    if p_amount <= 0:
        raise ValueError("Withdrawal amount must be positive")

    account_id, balance = _get_account_id_and_balance(p_user_id)
    if not account_id:
        raise ValueError(f"Account not found for user {p_user_id}")
    if balance < p_amount:
        raise ValueError(f"Insufficient balance: have {balance}, need {p_amount}")

    cur = _cursor()
    cur.execute(
        'UPDATE accounts SET balance = balance - %s, updated_at = NOW() WHERE user_id = %s',
        [p_amount, p_user_id]
    )
    cur.execute(
        'INSERT INTO transactions (from_account, amount, type, notes) VALUES (%s, %s, %s, %s)',
        [account_id, p_amount, "withdrawal", "withdrawal"]
    )
    return True


def _rpc_transfer_money(sender: str, receiver: str, amount: int) -> bool:
    """
    Transfer amount paise from sender to receiver.
    """
    if amount <= 0:
        raise ValueError("Transfer amount must be positive")

    from_id, from_balance = _get_account_id_and_balance(sender)
    to_id, _ = _get_account_id_and_balance(receiver)

    if not from_id:
        raise ValueError(f"Sender account not found: {sender}")
    if not to_id:
        raise ValueError(f"Receiver account not found: {receiver}")
    if from_balance < amount:
        raise ValueError(f"Insufficient balance: have {from_balance}, need {amount}")

    cur = _cursor()
    cur.execute(
        'UPDATE accounts SET balance = balance - %s, updated_at = NOW() WHERE user_id = %s',
        [amount, sender]
    )
    cur.execute(
        'UPDATE accounts SET balance = balance + %s, updated_at = NOW() WHERE user_id = %s',
        [amount, receiver]
    )
    cur.execute(
        'INSERT INTO transactions (from_account, to_account, amount, type, notes) '
        'VALUES (%s, %s, %s, %s, %s)',
        [from_id, to_id, amount, "transfer", f"transfer {sender} → {receiver}"]
    )
    return True


def _rpc_get_balance(p_user_id: str) -> int:
    """Returns account balance in paise."""
    _, balance = _get_account_id_and_balance(p_user_id)
    return balance


def _rpc_get_transactions(p_user_id: str) -> list:
    """Returns transaction history for a user."""
    account_id = _get_account_id(p_user_id)
    if not account_id:
        return []

    cur = _cursor()
    cur.execute(
        'SELECT t.id, t.from_account, t.to_account, t.amount, t.type, t.notes, t.created_at '
        'FROM transactions t '
        'WHERE t.from_account = %s OR t.to_account = %s '
        'ORDER BY t.created_at DESC LIMIT 50',
        [account_id, account_id]
    )
    return [dict(r) for r in cur.fetchall()]
