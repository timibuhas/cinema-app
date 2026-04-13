from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
import traceback

from auth.dependencies import get_admin_user
from database import get_db
from models import Hall, Seat
from schemas.hall import HallCreate, HallResponse

router = APIRouter(prefix="/halls", tags=["Halls"])


def row_to_index(row_value: str) -> int:
    value = (row_value or "").strip().upper()
    if not value:
        return 0

    if value.isdigit():
        return max(int(value) - 1, 0)

    return max(ord(value[0]) - ord("A"), 0)


def resolve_grid_row(seat_payload) -> int:
    if seat_payload.grid_row is not None:
        return seat_payload.grid_row
    return row_to_index(seat_payload.row)


def resolve_grid_col(seat_payload) -> int:
    if seat_payload.grid_col is not None:
        return seat_payload.grid_col
    return max(seat_payload.number - 1, 0)


def normalize_hall_seats(hall: Hall) -> bool:
    changed = False

    for seat in hall.seats:
        if seat.grid_row is None:
            seat.grid_row = row_to_index(seat.row)
            changed = True

        if seat.grid_col is None:
            seat.grid_col = max(seat.number - 1, 0)
            changed = True

    hall.seats.sort(key=lambda seat_item: (seat_item.row, seat_item.number))
    return changed


@router.post("", response_model=HallResponse)
def create_hall(
    hall: HallCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    try:
        if not hall.seats:
            raise HTTPException(status_code=400, detail="Hall must contain at least one seat")

        new_hall = Hall(name=hall.name, capacity=len(hall.seats))
        db.add(new_hall)
        db.flush()

        seat_objects = []
        seen = set()

        for seat in hall.seats:
            key = (seat.row, seat.number)
            if key in seen:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate seat in payload: row={seat.row}, number={seat.number}",
                )

            seen.add(key)
            seat_objects.append(
                Seat(
                    hall_id=new_hall.id,
                    row=seat.row,
                    number=seat.number,
                    grid_row=resolve_grid_row(seat),
                    grid_col=resolve_grid_col(seat),
                )
            )

        db.add_all(seat_objects)
        db.commit()
        db.refresh(new_hall)

        return new_hall

    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        print("CREATE_HALL_ERROR:", str(error))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error))


@router.get("", response_model=List[HallResponse])
def get_halls(db: Session = Depends(get_db)):
    halls = db.query(Hall).options(joinedload(Hall.seats)).all()

    changed = False
    for hall in halls:
        changed = normalize_hall_seats(hall) or changed

    if changed:
        db.commit()

    return halls


@router.get("/{hall_id}", response_model=HallResponse)
def get_hall(hall_id: UUID, db: Session = Depends(get_db)):
    hall = db.query(Hall).options(joinedload(Hall.seats)).filter(Hall.id == hall_id).first()

    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")

    if normalize_hall_seats(hall):
        db.commit()

    return hall


@router.put("/{hall_id}", response_model=HallResponse)
def update_hall(
    hall_id: UUID,
    hall_data: HallCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    try:
        hall = db.query(Hall).filter(Hall.id == hall_id).first()

        if not hall:
            raise HTTPException(status_code=404, detail="Hall not found")

        if not hall_data.seats:
            raise HTTPException(status_code=400, detail="Hall must contain at least one seat")

        seen = set()
        for seat in hall_data.seats:
            key = (seat.row, seat.number)
            if key in seen:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate seat in payload: row={seat.row}, number={seat.number}",
                )
            seen.add(key)

        hall.name = hall_data.name
        hall.capacity = len(hall_data.seats)

        db.query(Seat).filter(Seat.hall_id == hall.id).delete(synchronize_session=False)

        new_seats = [
            Seat(
                hall_id=hall.id,
                row=seat.row,
                number=seat.number,
                grid_row=resolve_grid_row(seat),
                grid_col=resolve_grid_col(seat),
            )
            for seat in hall_data.seats
        ]

        db.add_all(new_seats)
        db.commit()

        updated_hall = (
            db.query(Hall)
            .options(joinedload(Hall.seats))
            .filter(Hall.id == hall.id)
            .first()
        )

        normalize_hall_seats(updated_hall)
        return updated_hall

    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        print("UPDATE_HALL_ERROR:", str(error))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error))


@router.delete("/{hall_id}")
def delete_hall(
    hall_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    hall = db.query(Hall).filter(Hall.id == hall_id).first()

    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")

    db.delete(hall)
    db.commit()

    return {"detail": f"Hall {hall_id} deleted"}
