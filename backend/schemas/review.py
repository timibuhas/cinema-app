from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    movie_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewAuthor(BaseModel):
    first_name: str
    last_name: str
    model_config = ConfigDict(from_attributes=True)


class ReviewResponse(BaseModel):
    id: UUID
    user_id: UUID
    movie_id: UUID
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    user: Optional[ReviewAuthor] = None
    model_config = ConfigDict(from_attributes=True)


class CanReviewResponse(BaseModel):
    can_review: bool
    reason: Optional[str] = None  # "already_reviewed" | "no_reservation" | "screening_not_ended"
    existing_review: Optional[ReviewResponse] = None
