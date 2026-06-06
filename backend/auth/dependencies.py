# app/auth/dependencies.py
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from .jwt_handler import verify_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth_header.split(" ", 1)[1]

    payload = verify_jwt(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    return payload


def get_admin_user(user = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    return user