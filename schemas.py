from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, constr


class Token(BaseModel):
    access_token: str
    token_type: str


class Role(str, Enum):
    manager = "manager"
    member = "member"


class TokenData(BaseModel):
    id: int
    email: str
    role: Role


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    # pyrefly: ignore [invalid-annotation]
    password: constr(min_length=8)


class UserOut(UserBase):
    id: int
    role: Role

    class Config:
        from_attributes = True



class UserRoleUpdate(BaseModel):
    role: Role


class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[TaskStatus] = TaskStatus.todo


class TaskCreate(TaskBase):
    owner_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    owner_id: Optional[int] = None


class TaskOut(TaskBase):
    id: int
    owner_id: int
    owner_email: str

    class Config:
        from_attributes = True
