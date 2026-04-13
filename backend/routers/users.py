from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from auth.jwt_handler import hash_password
from database import get_db
from schemas.user import AdminUserCreate, UserResponse, UserUpdate
from models import User
from auth.dependencies import get_admin_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserResponse)
def create_user(
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    existing = db.query(User).filter(User.email == data.email).first()

    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    role = data.role if data.role in {"admin", "user"} else "user"

    new_user = User(
        email=data.email,
        password=hash_password(data.password[:72]),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role=role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    users = db.query(User).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    data: UserUpdate,
    db: Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.first_name = data.first_name
    user.last_name = data.last_name
    user.email = data.email
    user.phone = data.phone
    user.role = data.role

    if data.password:
        user.password =  hash_password(data.password[:72])

    db.commit()
    db.refresh(user)

    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}
