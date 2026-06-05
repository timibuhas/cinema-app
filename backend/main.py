from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from database import Base, engine
from routers import auth, chat, contact, halls, movies, reservations, reviews, screening, seats, users
from scheduler import create_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for col in ["genre", "director", "actors", "rating"]:
            conn.execute(text(f"ALTER TABLE movies ADD COLUMN IF NOT EXISTS {col} TEXT"))
        conn.commit()

    scheduler = create_scheduler()
    scheduler.start()
    print("[SCHEDULER] Started — daily reminders at 10:00 Europe/Bucharest.")

    yield

    scheduler.shutdown(wait=False)
    print("[SCHEDULER] Stopped.")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path(__file__).resolve().parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Legacy compatibility for older movie records that store image_url as /images/<file>.
project_root = Path(__file__).resolve().parent.parent
frontend_images_dir = project_root / "frontend" / "app" / "public" / "images"
backend_images_dir = uploads_dir / "images"
backend_images_dir.mkdir(parents=True, exist_ok=True)
images_dir = frontend_images_dir if frontend_images_dir.exists() else backend_images_dir
app.mount("/images", StaticFiles(directory=images_dir), name="images")

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(contact.router)
app.include_router(movies.router)
app.include_router(halls.router)
app.include_router(reservations.router)
app.include_router(reviews.router)
app.include_router(screening.router)
app.include_router(seats.router)
app.include_router(users.router)
