import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:root@localhost/cinema")

engine = create_engine(DATABASE_URL, connect_args={"options": "-c client_encoding=utf8"})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
