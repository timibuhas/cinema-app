import uuid
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True)
    password = Column(String)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    role = Column(String, default="user")

class Movie(Base):
    __tablename__ = "movies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(String)
    duration = Column(Integer)  # minute
    image_url = Column(String)
    banner_image_url = Column(String)
    trailer_url = Column(String)
    genre = Column(String)
    director = Column(String)
    actors = Column(String)
    rating = Column(String)

class Hall(Base):
    __tablename__ = "halls"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String)
    capacity = Column(Integer)

    seats = relationship("Seat", cascade="all, delete-orphan")

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    movie_id = Column(UUID(as_uuid=True), ForeignKey("movies.id"))
    hall_id = Column(UUID(as_uuid=True), ForeignKey("halls.id"))
    start_time = Column(DateTime)

    movie = relationship("Movie")
    hall = relationship("Hall")

class Seat(Base):
    __tablename__ = "seats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hall_id = Column(UUID(as_uuid=True), ForeignKey("halls.id"), nullable=False)
    row = Column(String)
    number = Column(Integer)
    grid_row = Column(Integer, nullable=False)
    grid_col = Column(Integer, nullable=False)

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID, ForeignKey("users.id"))
    screening_id = Column(UUID, ForeignKey("screenings.id"))
    seat_id = Column(UUID, ForeignKey("seats.id"))
    reserved_at = Column(DateTime, default=datetime.now)

    user = relationship("User")
    screening = relationship("Screening")
    seat = relationship("Seat")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    movie_id = Column(UUID(as_uuid=True), ForeignKey("movies.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User")
    movie = relationship("Movie")

    __table_args__ = (UniqueConstraint("user_id", "movie_id", name="uq_user_movie_review"),)