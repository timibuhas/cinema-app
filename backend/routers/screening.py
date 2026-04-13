from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID

from database import get_db
from models import Screening, Movie, Hall,Seat,Reservation
from schemas.screening import ScreeningCreate, ScreeningResponse,SeatAvailabilityResponse
from auth.dependencies import get_admin_user

router = APIRouter(prefix="/screenings", tags=["Screenings"])


def row_to_index(row_value: str) -> int:
    value = (row_value or "").strip().upper()
    if not value:
        return 0

    if value.isdigit():
        return max(int(value) - 1, 0)

    return max(ord(value[0]) - ord("A"), 0)


def resolve_grid_row(seat: Seat) -> int:
    if seat.grid_row is not None:
        return seat.grid_row
    return row_to_index(seat.row)


def resolve_grid_col(seat: Seat) -> int:
    if seat.grid_col is not None:
        return seat.grid_col
    return max(seat.number - 1, 0)


# CREATE
@router.post("", response_model=ScreeningResponse)
def create_screening(
    screening: ScreeningCreate,
    db: Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    # validări
    movie = db.query(Movie).filter(Movie.id == screening.movie_id).first()
    hall = db.query(Hall).filter(Hall.id == screening.hall_id).first()

    if not movie:
        raise HTTPException(404, "Movie not found")
    if not hall:
        raise HTTPException(404, "Hall not found")

    new_screening = Screening(**screening.dict())

    db.add(new_screening)
    db.commit()
    db.refresh(new_screening)

    return new_screening


# GET ALL
@router.get("", response_model=List[ScreeningResponse])
def get_screenings(db: Session = Depends(get_db)):
    screenings = db.query(Screening)\
        .options(
            joinedload(Screening.movie),
            joinedload(Screening.hall)
        ).all()
    
    return screenings


# GET ONE
@router.get("/{screening_id}", response_model=ScreeningResponse)
def get_screening(screening_id: UUID, db: Session = Depends(get_db)):
    screening = db.query(Screening).filter(Screening.id == screening_id).first()

    if not screening:
        raise HTTPException(404, "Screening not found")

    return screening


# UPDATE
@router.put("/{screening_id}", response_model=ScreeningResponse)
def update_screening(
    screening_id: UUID,
    screening_data: ScreeningCreate,
    db: Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    screening = db.query(Screening).filter(Screening.id == screening_id).first()

    if not screening:
        raise HTTPException(404, "Screening not found")

    movie = db.query(Movie).filter(Movie.id == screening_data.movie_id).first()
    hall = db.query(Hall).filter(Hall.id == screening_data.hall_id).first()

    if not movie:
        raise HTTPException(404, "Movie not found")
    if not hall:
        raise HTTPException(404, "Hall not found")

    screening.movie_id = screening_data.movie_id
    screening.hall_id = screening_data.hall_id
    screening.start_time = screening_data.start_time

    db.commit()
    db.refresh(screening)

    return screening


# DELETE
@router.delete("/{screening_id}")
def delete_screening(
    screening_id: UUID,
    db: Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    screening = db.query(Screening).filter(Screening.id == screening_id).first()

    if not screening:
        raise HTTPException(404, "Screening not found")

    db.delete(screening)
    db.commit()

    return {"detail": "Deleted"}

@router.get("/{screening_id}/seats", response_model=List[SeatAvailabilityResponse])
def get_seats_by_screening(screening_id: UUID, db: Session = Depends(get_db)):
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    seats = db.query(Seat).filter(Seat.hall_id == screening.hall_id).all()
    seats = sorted(seats, key=lambda seat: (resolve_grid_row(seat), resolve_grid_col(seat)))

    reserved_seat_ids = {
        reservation.seat_id
        for reservation in db.query(Reservation).filter(Reservation.screening_id == screening_id).all()
    }

    changed = False
    response_payload = []

    for seat in seats:
        grid_row = resolve_grid_row(seat)
        grid_col = resolve_grid_col(seat)

        if seat.grid_row != grid_row or seat.grid_col != grid_col:
            seat.grid_row = grid_row
            seat.grid_col = grid_col
            changed = True

        response_payload.append(
            SeatAvailabilityResponse(
                id=seat.id,
                row=seat.row,
                number=seat.number,
                grid_row=grid_row,
                grid_col=grid_col,
                occupied=seat.id in reserved_seat_ids,
            )
        )

    if changed:
        db.commit()

    return response_payload
