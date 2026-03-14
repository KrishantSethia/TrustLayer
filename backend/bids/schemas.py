from pydantic import BaseModel, Field
from typing import Optional


class BidCreateRequest(BaseModel):
    project_id: str
    proposed_rate: int = Field(..., gt=0, description="In paise")
    message: str = Field(..., min_length=10)
