from pydantic import BaseModel
from typing import Optional

class SequenceRequest(BaseModel):
    prompt: str

class SequenceResponse(BaseModel):
    ordered_sequence: list[str]
    vibe: Optional[str] = "neutral"
    control_suggestion: Optional[str] = "auto"
    inferred_mechanic: Optional[str] = None
    animation_candidates: Optional[list[str]] = None