from pydantic import BaseModel, ConfigDict
from uuid import UUID


class SeatBase(BaseModel):
    row: str
    number: int
    grid_row: int | None = None
    grid_col: int | None = None


class SeatCreate(SeatBase):
    hall_id: UUID | None = None


class SeatResponse(SeatBase):
    id: UUID
    hall_id: UUID

    model_config = ConfigDict(from_attributes=True)
