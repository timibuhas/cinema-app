from pydantic import BaseModel
from uuid import UUID
from schemas.seat import SeatCreate,SeatResponse
from typing import List

class HallCreate(BaseModel):
    name: str
    seats: List[SeatCreate]


class HallResponse(BaseModel):
    id: UUID
    name: str
    capacity: int
    seats: List[SeatResponse] = []

    class Config:
        from_attributes = True