from pydantic import BaseModel
from uuid import UUID


class MovieCreate(BaseModel):
    title: str
    description: str
    duration: int
    image_url: str | None = None
    banner_image_url: str | None = None
    trailer_url: str | None = None
    genre: str | None = None
    director: str | None = None
    actors: str | None = None
    rating: str | None = None


class MovieResponse(BaseModel):
    id: UUID
    title: str
    description: str
    duration: int
    image_url: str | None = None
    banner_image_url: str | None = None
    trailer_url: str | None = None
    genre: str | None = None
    director: str | None = None
    actors: str | None = None
    rating: str | None = None
    avg_rating: float | None = None
    review_count: int = 0

    class Config:
        from_attributes = True
