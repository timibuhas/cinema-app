from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from auth.dependencies import get_current_user
from database import get_db
from models import Movie, Reservation, Review, Screening
from schemas.review import CanReviewResponse, ReviewCreate, ReviewResponse

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=ReviewResponse)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = UUID(user["sub"])

    existing = db.query(Review).filter(
        Review.user_id == user_id, Review.movie_id == data.movie_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ai lăsat deja o recenzie pentru acest film.")

    movie = db.query(Movie).filter(Movie.id == data.movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Film negăsit.")

    now = datetime.now()
    duration = movie.duration or 0

    eligible_screening = (
        db.query(Screening)
        .join(Reservation, Reservation.screening_id == Screening.id)
        .filter(
            Reservation.user_id == user_id,
            Screening.movie_id == data.movie_id,
        )
        .all()
    )

    if not eligible_screening:
        raise HTTPException(status_code=403, detail="Poți lăsa o recenzie doar pentru filmele la care ai o rezervare.")

    finished = any(
        s.start_time + timedelta(minutes=duration) < now
        for s in eligible_screening
    )
    if not finished:
        raise HTTPException(status_code=403, detail="Poți lăsa o recenzie doar după terminarea filmului.")

    review = Review(
        user_id=user_id,
        movie_id=data.movie_id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return db.query(Review).options(joinedload(Review.user)).filter(Review.id == review.id).first()


@router.get("/movie/{movie_id}", response_model=list[ReviewResponse])
def get_movie_reviews(movie_id: UUID, db: Session = Depends(get_db)):
    return (
        db.query(Review)
        .options(joinedload(Review.user))
        .filter(Review.movie_id == movie_id)
        .order_by(Review.created_at.desc())
        .all()
    )


@router.get("/can-review/{movie_id}", response_model=CanReviewResponse)
def can_review(movie_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    user_id = UUID(user["sub"])

    existing = (
        db.query(Review)
        .options(joinedload(Review.user))
        .filter(Review.user_id == user_id, Review.movie_id == movie_id)
        .first()
    )
    if existing:
        return CanReviewResponse(can_review=False, reason="already_reviewed", existing_review=existing)

    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(404, "Film negăsit.")

    screenings = (
        db.query(Screening)
        .join(Reservation, Reservation.screening_id == Screening.id)
        .filter(Reservation.user_id == user_id, Screening.movie_id == movie_id)
        .all()
    )
    if not screenings:
        return CanReviewResponse(can_review=False, reason="no_reservation")

    now = datetime.now()
    duration = movie.duration or 0
    finished = any(s.start_time + timedelta(minutes=duration) < now for s in screenings)
    if not finished:
        return CanReviewResponse(can_review=False, reason="screening_not_ended")

    return CanReviewResponse(can_review=True)


@router.delete("/{review_id}", response_model=ReviewResponse)
def delete_review(review_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    user_id = UUID(user["sub"])
    review = db.query(Review).options(joinedload(Review.user)).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(404, "Recenzie negăsită.")
    if review.user_id != user_id:
        raise HTTPException(403, "Nu poți șterge recenzia altcuiva.")
    db.delete(review)
    db.commit()
    return review
