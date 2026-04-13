from pydantic import BaseModel
from uuid import UUID
class MovieCreate(BaseModel):
    title: str
    description: str
    duration: int
    image_url: str | None = None

class MovieResponse(BaseModel):
    id: UUID
    title: str
    description: str
    duration: int
    image_url: str | None = None

    class Config:
        from_attributes = True
