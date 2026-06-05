from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminReservationCreate(BaseModel):
    user_id: UUID
    screening_id: UUID
    seat_id: UUID


class ClientReservationCreate(BaseModel):
    screening_id: UUID
    seat_id: UUID


class AdminReservationBulkCreate(BaseModel):
    user_id: UUID
    screening_id: UUID
    seat_ids: list[UUID] = Field(min_length=1)
    modified: bool = False


class ClientReservationBulkCreate(BaseModel):
    screening_id: UUID
    seat_ids: list[UUID] = Field(min_length=1)
    modified: bool = False


class SeatMini(BaseModel):
    row: str
    number: int

    model_config = ConfigDict(from_attributes=True)


class UserMini(BaseModel):
    first_name: str
    last_name: str

    model_config = ConfigDict(from_attributes=True)


class MovieMiniRes(BaseModel):
    title: str
    image_url: Optional[str] = None
    genre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class HallMiniRes(BaseModel):
    name: str

    model_config = ConfigDict(from_attributes=True)


class ScreeningMini(BaseModel):
    start_time: datetime
    movie: Optional[MovieMiniRes] = None
    hall: Optional[HallMiniRes] = None

    model_config = ConfigDict(from_attributes=True)


class ReservationResponse(BaseModel):
    id: UUID
    user_id: UUID
    screening_id: UUID
    seat_id: UUID
    reserved_at: datetime

    user: Optional[UserMini] = None
    seat: Optional[SeatMini] = None
    screening: Optional[ScreeningMini] = None

    model_config = ConfigDict(from_attributes=True)
