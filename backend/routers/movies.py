from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth.dependencies import get_admin_user
from database import get_db
from models import Movie
from schemas.movie import MovieCreate, MovieResponse

router = APIRouter(prefix="/movies", tags=["Movies"])

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads" / "movies"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("", response_model=MovieResponse)
def create_movie(
    movie: MovieCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    new_movie = Movie(
        title=movie.title,
        description=movie.description,
        duration=movie.duration,
        image_url=movie.image_url,
    )

    db.add(new_movie)
    db.commit()
    db.refresh(new_movie)

    return new_movie


@router.post("/upload-image")
async def upload_movie_image(
    file: UploadFile = File(...),
    admin=Depends(get_admin_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}:
        suffix = ".jpg"

    filename = f"{uuid4().hex}{suffix}"
    target_path = UPLOAD_DIR / filename

    with target_path.open("wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return {"image_url": f"/uploads/movies/{filename}"}


@router.get("", response_model=list[MovieResponse])
def get_movies(db: Session = Depends(get_db)):
    return db.query(Movie).all()


@router.get("/{movie_id}", response_model=MovieResponse)
def get_movie(movie_id: UUID, db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


@router.put("/{movie_id}", response_model=MovieResponse)
def update_movie(
    movie_id: UUID,
    movie_data: MovieCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    movie.title = movie_data.title
    movie.description = movie_data.description
    movie.duration = movie_data.duration
    movie.image_url = movie_data.image_url

    db.commit()
    db.refresh(movie)
    return movie


@router.delete("/{movie_id}")
def delete_movie(
    movie_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    db.delete(movie)
    db.commit()

    return {"detail": f"Movie {movie_id} deleted"}
