from fastapi import APIRouter, Depends, HTTPException, status, Response
from auth.dependencies import get_current_user
from sqlalchemy.orm import Session
from database import get_db
import models, schemas.user
from auth.jwt_handler import hash_password, verify_password, create_access_token


router = APIRouter()

# ===== LOGIN =====
@router.post("/login")
def login(user: schemas.user.UserLogin, response: Response, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        # Folosim HTTPException pentru status corect
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Creăm tokenul JWT
    token_data = {
        "sub": str(db_user.id),
        "role": db_user.role,
    }
    token = create_access_token(token_data)

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",    # sau "strict"
        max_age=60 * 60 * 24  # 1 zi
    )

    return {
        "message": "Login successful",
        "role": db_user.role
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")  # șterge cookie-ul
    return {"message": "Logged out successfully"}

    
# ===== REGISTER =====
@router.post("/register")
def register(user: schemas.user.UserCreate, db: Session = Depends(get_db)):
    # verifică dacă userul există deja
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists"
        )

    # hash parola
    hashed_password = hash_password(user.password[:72])  # limitează la 72 caractere

    # creează user nou
    new_user = models.User(
        email=user.email,
        password=hashed_password,
        role="user",
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created successfully"
    }

@router.get("/me")
def read_me(user: dict = Depends(get_current_user),db: Session = Depends(get_db)):
    
    db_user = db.query(models.User).filter(models.User.id == user["sub"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": db_user.id,
        "email": db_user.email,
        "role": db_user.role,
        "first_name": db_user.first_name,
        "last_name": db_user.last_name,
        "phone": db_user.phone
    }
