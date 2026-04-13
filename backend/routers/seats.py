from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from auth.dependencies import get_admin_user
from database import get_db
from models import Seat, Hall
from schemas.seat import SeatCreate, SeatResponse

router = APIRouter(prefix="/seats", tags=["Seats"])


def row_to_index(row_value: str) -> int:
    value = (row_value or "").strip().upper()
    if not value:
        return 0

    if value.isdigit():
        return max(int(value) - 1, 0)

    return max(ord(value[0]) - ord("A"), 0)


def normalize_grid(row_value: str, number_value: int, grid_row: int | None, grid_col: int | None):
    resolved_row = grid_row if grid_row is not None else row_to_index(row_value)
    resolved_col = grid_col if grid_col is not None else max(number_value - 1, 0)
    return resolved_row, resolved_col


@router.get("", response_model=List[SeatResponse])
def get_all_seats(
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    seats = db.query(Seat).all()

    changed = False
    for seat in seats:
        next_row, next_col = normalize_grid(seat.row, seat.number, seat.grid_row, seat.grid_col)
        if seat.grid_row != next_row or seat.grid_col != next_col:
            seat.grid_row = next_row
            seat.grid_col = next_col
            changed = True

    if changed:
        db.commit()

    return seats


@router.post("", response_model=SeatResponse)
def create_seat(
    seat: SeatCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    if not seat.hall_id:
        raise HTTPException(status_code=400, detail="hall_id is required")

    hall = db.query(Hall).filter(Hall.id == seat.hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")

    grid_row, grid_col = normalize_grid(seat.row, seat.number, seat.grid_row, seat.grid_col)

    new_seat = Seat(
        hall_id=seat.hall_id,
        row=seat.row,
        number=seat.number,
        grid_row=grid_row,
        grid_col=grid_col,
    )

    db.add(new_seat)
    db.commit()
    db.refresh(new_seat)

    return new_seat


@router.put("/{seat_id}", response_model=SeatResponse)
def update_seat(
    seat_id: UUID,
    payload: SeatCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    seat = db.query(Seat).filter(Seat.id == seat_id).first()
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")

    target_hall_id = payload.hall_id or seat.hall_id
    hall = db.query(Hall).filter(Hall.id == target_hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")

    grid_row, grid_col = normalize_grid(payload.row, payload.number, payload.grid_row, payload.grid_col)

    seat.hall_id = target_hall_id
    seat.row = payload.row
    seat.number = payload.number
    seat.grid_row = grid_row
    seat.grid_col = grid_col

    db.commit()
    db.refresh(seat)

    return seat


@router.delete("/{seat_id}")
def delete_seat(
    seat_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    seat = db.query(Seat).filter(Seat.id == seat_id).first()
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")

    db.delete(seat)
    db.commit()

    return {"message": "Seat deleted"}


@router.post("/generate/{hall_id}")
def generate_seats(
    hall_id: UUID,
    rows: int,
    seats_per_row: int,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    hall = db.query(Hall).filter(Hall.id == hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")

    generated = []
    for row_index in range(rows):
        row_label = chr(ord("A") + row_index)
        for number in range(1, seats_per_row + 1):
            generated.append(
                Seat(
                    hall_id=hall_id,
                    row=row_label,
                    number=number,
                    grid_row=row_index,
                    grid_col=number - 1,
                )
            )

    db.add_all(generated)
    hall.capacity = (hall.capacity or 0) + len(generated)
    db.commit()

    return {"created": len(generated)}


@router.get("/hall/{hall_id}", response_model=List[SeatResponse])
def get_seats_by_hall(hall_id: UUID, db: Session = Depends(get_db)):
    seats = db.query(Seat).filter(Seat.hall_id == hall_id).all()

    changed = False
    for seat in seats:
        next_row, next_col = normalize_grid(seat.row, seat.number, seat.grid_row, seat.grid_col)
        if seat.grid_row != next_row or seat.grid_col != next_col:
            seat.grid_row = next_row
            seat.grid_col = next_col
            changed = True

    if changed:
        db.commit()

    return seats
