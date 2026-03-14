from pydantic import BaseModel, Field


class SubmitRequest(BaseModel):
    deliverable_text: str = Field(..., min_length=1)


class ExtensionRequest(BaseModel):
    new_deadline: str = Field(..., description="ISO datetime string")
    reason: str = Field(..., min_length=10)


class VetoConfirmRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
