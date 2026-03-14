from pydantic import BaseModel, Field
from typing import Literal


class RuleRequest(BaseModel):
    ruling: Literal["EMPLOYER_WIN", "FREELANCER_WIN"]
    admin_notes: str = Field(default="", description="Optional notes from admin")
