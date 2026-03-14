from fastapi import APIRouter
from auth.schemas import SignupRequest, LoginRequest, TokenResponse
from auth import service

router = APIRouter()


@router.post("/signup", response_model=TokenResponse)
def signup(body: SignupRequest):
    user = service.create_user(
        name=body.name,
        email=body.email,
        phone=body.phone,
        password=body.password,
        role=body.role,
    )
    from jose import jwt
    from datetime import datetime, timedelta
    from config import settings
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    token = jwt.encode({"sub": user["id"], "exp": expire}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    return service.login(body.email, body.password)
