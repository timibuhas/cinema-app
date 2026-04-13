from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import auth, chat, halls, movies, reservations, screening, seats, users

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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

Base.metadata.create_all(bind=engine)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(movies.router)
app.include_router(halls.router)
app.include_router(reservations.router)
app.include_router(screening.router)
app.include_router(seats.router)
app.include_router(users.router)
