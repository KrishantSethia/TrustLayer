from datetime import datetime, timedelta
import bcrypt
from jose import jwt
from fastapi import HTTPException
from database import get_db
from config import settings
from exceptions import NotFoundError, ConflictError


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def _check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _make_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_user(name: str, email: str, phone: int, password: str, role: str) -> dict:
    db = get_db()

    # Check duplicate email
    existing = db.table("users").select("id").eq("email", email).execute()
    if existing.data:
        raise ConflictError("Email already registered")

    # Step 1: call banking.md RPC (creates user + account rows)
    result = db.rpc("create_user", {
        "p_name": name,
        "p_email": email,
        "p_phone": phone,
        "p_account_type": "personal",
    }).execute()
    user_id = result.data

    # Step 2: set TrustLayer fields via direct UPDATE
    db.table("users").update({
        "password_hash": _hash_password(password),
        "role": role,
    }).eq("id", user_id).execute()

    return db.table("users").select(
        "id, name, email, phone, role, pfi_score, employer_trust_score, created_at"
    ).eq("id", user_id).single().execute().data


def authenticate_user(email: str, password: str) -> dict:
    db = get_db()
    result = db.table("users").select("*").eq("email", email).single().execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = result.data
    if not _check_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("suspended"):
        raise HTTPException(status_code=403, detail="Account suspended")
    return user


def login(email: str, password: str) -> dict:
    user = authenticate_user(email, password)
    token = _make_token(user["id"])
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return {"access_token": token, "token_type": "bearer", "user": safe_user}
