from pydantic import BaseModel, ConfigDict
from uuid import UUID


class UserCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: str


class AdminUserCreate(UserCreate):
    role: str = "user"


class UserUpdate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    role: str
    password: str | None = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: str
    role: str

    model_config = ConfigDict(from_attributes=True)
