from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from auth.dependencies import get_admin_user, get_current_user
from database import get_db
from models import Hall, Movie, Reservation, Screening, Seat, User
from schemas.reservation import (
    AdminReservationBulkCreate,
    AdminReservationCreate,
    ClientReservationBulkCreate,
    ClientReservationCreate,
    ReservationResponse,
)

router = APIRouter(prefix="/reservations", tags=["Reservations"])


def _notify_confirmed(reservations: list[Reservation]) -> None:
    """Fire-and-forget: send confirmation email+SMS for a freshly created group."""
    if not reservations:
        return
    try:
        from notifications import notify_reservation_confirmed
        first = reservations[0]
        user = first.user
        screening = first.screening
        if not user or not screening:
            return
        seats = [
            f"{r.seat.row}{r.seat.number}"
            for r in reservations
            if r.seat
        ]
        notify_reservation_confirmed(
            user_name=f"{user.first_name} {user.last_name}",
            user_email=user.email or "",
            user_phone=user.phone or "",
            movie_title=screening.movie.title if screening.movie else "Film",
            hall_name=screening.hall.name if screening.hall else "—",
            start_time=screening.start_time,
            seats=seats,
        )
    except Exception as exc:
        print(f"NOTIFY_ERROR: {exc}")


def _notify_modified(reservations: list[Reservation]) -> None:
    """Fire-and-forget: send modification email+SMS after seat change."""
    if not reservations:
        return
    try:
        from notifications import notify_reservation_modified
        first = reservations[0]
        user = first.user
        screening = first.screening
        if not user or not screening:
            return
        seats = [
            f"{r.seat.row}{r.seat.number}"
            for r in reservations
            if r.seat
        ]
        notify_reservation_modified(
            user_name=f"{user.first_name} {user.last_name}",
            user_email=user.email or "",
            user_phone=user.phone or "",
            movie_title=screening.movie.title if screening.movie else "Film",
            hall_name=screening.hall.name if screening.hall else "—",
            start_time=screening.start_time,
            new_seats=seats,
        )
    except Exception as exc:
        print(f"NOTIFY_ERROR: {exc}")


def get_screening_or_404(db: Session, screening_id: UUID) -> Screening:
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    return screening


def validate_seats_for_screening(db: Session, screening: Screening, seat_ids: list[UUID], ignore_reservation_id: UUID | None = None) -> list[Seat]:
    if not seat_ids:
        raise HTTPException(status_code=400, detail="At least one seat is required")

    unique_ids = list(dict.fromkeys(seat_ids))
    if len(unique_ids) != len(seat_ids):
        raise HTTPException(status_code=400, detail="Duplicate seats in payload")

    seats = db.query(Seat).filter(Seat.id.in_(unique_ids)).all()
    if len(seats) != len(unique_ids):
        raise HTTPException(status_code=404, detail="One or more seats were not found")

    for seat in seats:
        if seat.hall_id != screening.hall_id:
            raise HTTPException(status_code=400, detail=f"Seat {seat.id} does not belong to this hall")

    reserved_query = db.query(Reservation).filter(
        Reservation.screening_id == screening.id,
        Reservation.seat_id.in_(unique_ids),
    )

    if ignore_reservation_id is not None:
        reserved_query = reserved_query.filter(Reservation.id != ignore_reservation_id)

    reserved = reserved_query.all()
    if reserved:
        raise HTTPException(status_code=400, detail="One or more seats are already reserved")

    return seats


def create_many_reservations(db: Session, user_id: UUID, screening_id: UUID, seat_ids: list[UUID]) -> list[Reservation]:
    screening = get_screening_or_404(db, screening_id)
    seats = validate_seats_for_screening(db, screening, seat_ids)

    reservations = [
        Reservation(user_id=user_id, screening_id=screening_id, seat_id=seat.id)
        for seat in seats
    ]

    db.add_all(reservations)
    db.commit()

    for reservation in reservations:
        db.refresh(reservation)

    return reservations


def get_reservation_with_relations(db: Session, reservation_id: UUID) -> Reservation | None:
    return (
        db.query(Reservation)
        .options(
            joinedload(Reservation.user),
            joinedload(Reservation.screening).options(
                joinedload(Screening.movie),
                joinedload(Screening.hall),
            ),
            joinedload(Reservation.seat),
        )
        .filter(Reservation.id == reservation_id)
        .first()
    )


@router.post("/me", response_model=ReservationResponse)
def create_my_reservation(
    data: ClientReservationCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    reservations = create_many_reservations(
        db,
        user_id=UUID(user["sub"]),
        screening_id=data.screening_id,
        seat_ids=[data.seat_id],
    )
    return reservations[0]


def _bg_notify(reservation_ids: list[UUID], modified: bool) -> None:
    """Background task: open own session, load full relations, send notification."""
    from database import SessionLocal as _SessionLocal
    db = _SessionLocal()
    try:
        full = (
            db.query(Reservation)
            .options(
                joinedload(Reservation.user),
                joinedload(Reservation.seat),
                joinedload(Reservation.screening).options(
                    joinedload(Screening.movie),
                    joinedload(Screening.hall),
                ),
            )
            .filter(Reservation.id.in_(reservation_ids))
            .all()
        )
        (_notify_modified if modified else _notify_confirmed)(full)
    finally:
        db.close()


@router.post("/me/bulk", response_model=list[ReservationResponse])
def create_my_reservations_bulk(
    data: ClientReservationBulkCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    result = create_many_reservations(
        db,
        user_id=UUID(user["sub"]),
        screening_id=data.screening_id,
        seat_ids=data.seat_ids,
    )
    background_tasks.add_task(_bg_notify, [r.id for r in result], getattr(data, "modified", False))
    return result


@router.post("/admin", response_model=ReservationResponse)
def create_reservation_admin(
    data: AdminReservationCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    target_user = db.query(User).filter(User.id == data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    reservations = create_many_reservations(
        db,
        user_id=data.user_id,
        screening_id=data.screening_id,
        seat_ids=[data.seat_id],
    )
    return reservations[0]


@router.post("/admin/bulk", response_model=list[ReservationResponse])
def create_reservation_admin_bulk(
    data: AdminReservationBulkCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    target_user = db.query(User).filter(User.id == data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    result = create_many_reservations(
        db,
        user_id=data.user_id,
        screening_id=data.screening_id,
        seat_ids=data.seat_ids,
    )
    background_tasks.add_task(_bg_notify, [r.id for r in result], getattr(data, "modified", False))
    return result


@router.get("/me", response_model=list[ReservationResponse])
def get_my_reservations(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return (
        db.query(Reservation)
        .options(
            joinedload(Reservation.user),
            joinedload(Reservation.screening).options(
                joinedload(Screening.movie),
                joinedload(Screening.hall),
            ),
            joinedload(Reservation.seat),
        )
        .filter(Reservation.user_id == user["sub"])
        .all()
    )


@router.get("/admin", response_model=list[ReservationResponse])
def get_all_reservations(
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    return (
        db.query(Reservation)
        .options(
            joinedload(Reservation.user),
            joinedload(Reservation.screening).options(
                joinedload(Screening.movie),
                joinedload(Screening.hall),
            ),
            joinedload(Reservation.seat),
        )
        .all()
    )


@router.get("/me/{reservation_id}", response_model=ReservationResponse)
def get_my_reservation(
    reservation_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    reservation = get_reservation_with_relations(db, reservation_id)

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if str(reservation.user_id) != str(user["sub"]):
        raise HTTPException(status_code=403, detail="Not allowed")

    return reservation


@router.get("/admin/{reservation_id}", response_model=ReservationResponse)
def get_reservation_admin(
    reservation_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    reservation = get_reservation_with_relations(db, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@router.put("/me/{reservation_id}", response_model=ReservationResponse)
def update_my_reservation(
    reservation_id: UUID,
    data: ClientReservationCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if str(reservation.user_id) != str(user["sub"]):
        raise HTTPException(status_code=403, detail="Not allowed")

    screening = get_screening_or_404(db, data.screening_id)
    validate_seats_for_screening(db, screening, [data.seat_id], ignore_reservation_id=reservation.id)

    reservation.screening_id = data.screening_id
    reservation.seat_id = data.seat_id

    db.commit()
    db.refresh(reservation)

    return reservation


@router.put("/admin/{reservation_id}", response_model=ReservationResponse)
def update_reservation_admin(
    reservation_id: UUID,
    data: AdminReservationCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    target_user = db.query(User).filter(User.id == data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    screening = get_screening_or_404(db, data.screening_id)
    validate_seats_for_screening(db, screening, [data.seat_id], ignore_reservation_id=reservation.id)

    reservation.user_id = data.user_id
    reservation.screening_id = data.screening_id
    reservation.seat_id = data.seat_id

    db.commit()
    db.refresh(reservation)

    return reservation


@router.delete("/me/{reservation_id}", response_model=ReservationResponse)
def delete_my_reservation(
    reservation_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    reservation = get_reservation_with_relations(db, reservation_id)

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if str(reservation.user_id) != str(user["sub"]):
        raise HTTPException(status_code=403, detail="Not allowed to delete this reservation")

    deleted_reservation = ReservationResponse.model_validate(reservation)
    db.delete(reservation)
    db.commit()

    return deleted_reservation


@router.delete("/admin/{reservation_id}", response_model=ReservationResponse)
def delete_reservation_admin(
    reservation_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    reservation = get_reservation_with_relations(db, reservation_id)

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    deleted_reservation = ReservationResponse.model_validate(reservation)
    db.delete(reservation)
    db.commit()

    return deleted_reservation
