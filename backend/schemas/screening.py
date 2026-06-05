from pydantic import BaseModel,ConfigDict
from uuid import UUID
from datetime import datetime
from schemas.movie import MovieResponse
from schemas.hall import HallResponse

class ScreeningCreate(BaseModel):
    movie_id: UUID
    hall_id: UUID
    start_time: datetime

class MovieMini(BaseModel):
    id: UUID
    title: str
    image_url: str | None = None
    genre: str | None = None

    model_config = ConfigDict(from_attributes=True)


class HallMini(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)

class ScreeningResponse(BaseModel):
    id: UUID
    movie_id: UUID
    hall_id: UUID
    start_time: datetime

    movie: MovieMini
    hall: HallMini

    model_config = ConfigDict(from_attributes=True)

class SeatAvailabilityResponse(BaseModel):
    id: UUID
    row: str
    number: int
    grid_row: int
    grid_col: int
    occupied: bool

    model_config = ConfigDict(from_attributes=True)
