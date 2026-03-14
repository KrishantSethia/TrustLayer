from pydantic import BaseModel, Field
from typing import Optional


class DecomposeRequest(BaseModel):
    raw_requirement: str = Field(..., min_length=10)
    category: str = Field(default="WRITING")
    total_duration_days: int = Field(default=14, ge=1, le=365)
    source_text: Optional[str] = Field(default=None, description="Source text for TRANSLATION category")


class ProjectCreateRequest(BaseModel):
    raw_requirement: str = Field(..., min_length=10)
    category: str = Field(default="WRITING")
    total_budget: int = Field(..., gt=0, description="In paise")
    ai_output: dict  # decomposer response — milestones must have suggested_deadline_days
    source_text: Optional[str] = Field(default=None, description="Source text for TRANSLATION category")


class FundResponse(BaseModel):
    razorpay_order_id: str
    razorpay_key_id: str
    amount: int
    currency: str
    project_id: str
