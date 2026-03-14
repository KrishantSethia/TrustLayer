from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5)
    phone: int = Field(..., ge=1000000000, le=9999999999)
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(EMPLOYER|FREELANCER)$")


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
