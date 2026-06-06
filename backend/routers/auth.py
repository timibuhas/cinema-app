from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from auth.dependencies import get_current_user
from sqlalchemy.orm import Session
from database import get_db
import models, schemas.user
from auth.jwt_handler import hash_password, verify_password, create_access_token


router = APIRouter()


class VerifyEmailSendRequest(BaseModel):
    email: str


class VerifyEmailCheckRequest(BaseModel):
    email: str
    code: str


@router.post("/verify-email/send")
def send_verification_email(payload: VerifyEmailSendRequest):
    import verification as ver
    from notifications import send_email

    code = ver.generate_and_store(payload.email)

    html = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);padding:28px 40px;text-align:center;">
            <p style="margin:0;font-size:26px;font-weight:800;color:#fff">🎬 CinemaApp</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.6)">Verificare adresă de email</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#444">
              Folosește codul de mai jos pentru a-ți verifica adresa de email și a finaliza crearea contului:
            </p>
            <div style="background:#f0f0ff;border:2px dashed #6366f1;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
              <span style="font-size:40px;font-weight:900;letter-spacing:14px;color:#4f46e5;font-family:monospace">{code}</span>
            </div>
            <p style="margin:0;font-size:13px;color:#888">
              Codul este valabil <strong>10 minute</strong>.<br>
              Dacă nu ai cerut acest cod, ignoră acest email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px;background:#f8f8fa;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaa">CinemaApp &mdash; aplicația ta pentru cinema</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    ok = send_email(payload.email, "Cod verificare cont — CinemaApp", html)
    if not ok:
        raise HTTPException(status_code=500, detail="Nu s-a putut trimite email-ul de verificare.")
    return {"message": "Cod trimis"}


@router.post("/verify-email/check")
def check_verification_code(payload: VerifyEmailCheckRequest):
    import verification as ver

    if not ver.verify_code(payload.email, payload.code):
        raise HTTPException(status_code=400, detail="Cod incorect sau expirat.")
    return {"verified": True}

# ===== LOGIN =====
@router.post("/login")
def login(user: schemas.user.UserLogin, response: Response, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

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
        samesite="lax",
        max_age=60 * 60 * 24
    )

    return {
        "message": "Login successful",
        "role": db_user.role
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}

    
# ===== REGISTER =====
@router.post("/register")
def register(user: schemas.user.UserCreate, db: Session = Depends(get_db)):
    import verification as ver

    if not ver.is_verified(user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email-ul nu a fost verificat. Trimite și confirmă codul înainte de înregistrare."
        )

    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists"
        )

    hashed_password = hash_password(user.password[:72])

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

    ver.consume(user.email)

    return {"message": "User created successfully"}

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
