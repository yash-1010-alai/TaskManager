from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

import auth, crud, models, schemas
from database import Base, engine, get_db

app = FastAPI(title="FastAPI PostgreSQL JWT Task Manager")
static_dir = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

models.Base.metadata.create_all(bind=engine)


@app.get("/", include_in_schema=False)
def home_redirect():
    return RedirectResponse(url="/static/index.html")


@app.get("/login", include_in_schema=False)
def login_redirect():
    return RedirectResponse(url="/static/login.html")


@app.get("/dashboard", include_in_schema=False)
def dashboard_redirect():
    return RedirectResponse(url="/static/dashboard.html")


@app.get("/register", include_in_schema=False)
def register_redirect():
    return RedirectResponse(url="/static/register.html")


@app.get("/tasks-ui", include_in_schema=False)
def tasks_redirect():
    return RedirectResponse(url="/static/tasks.html")


@app.get("/task-detail", include_in_schema=False)
def task_detail_redirect():
    return RedirectResponse(url="/static/task-detail.html")


def require_manager(current_user: schemas.TokenData = Depends(auth.get_current_user)) -> schemas.TokenData:
    if current_user.role != schemas.Role.manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager role required",
        )
    return current_user


@app.post("/auth/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, email=user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = auth.get_password_hash(user.password)
    return crud.create_user(db=db, user=user, hashed_password=hashed_password)


@app.post("/auth/login", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    current_user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(
        data={"sub": current_user.email, "role": current_user.role.value, "user_id": current_user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=schemas.UserOut)
def read_current_user(current_user: schemas.TokenData = Depends(auth.get_current_user)):
    return current_user


@app.get("/users/", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(require_manager),
):
    return crud.get_users(db)


@app.put("/users/{user_id}/role", response_model=schemas.UserOut)
def change_user_role(
    user_id: int,
    update: schemas.UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(require_manager),
):
    user = crud.update_user_role(db, user_id=user_id, role=update.role)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/tasks/", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task_for_user(
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(auth.get_current_user),
):
    target_owner_id = current_user.id
    if task.owner_id is not None:
        if current_user.role == schemas.Role.manager:
            target_user = crud.get_user_by_id(db, task.owner_id)
            if not target_user:
                raise HTTPException(status_code=404, detail="Assigned user not found")
            target_owner_id = task.owner_id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers can assign tasks to other users",
            )
    return crud.create_task(db=db, task=task, user_id=target_owner_id)


@app.get("/tasks/", response_model=list[schemas.TaskOut])
def read_tasks(
    status: Optional[schemas.TaskStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(auth.get_current_user),
):
    return crud.get_tasks(
        db,
        user_id=current_user.id,
        current_role=current_user.role,
        status=status,
        skip=skip,
        limit=limit,
    )


@app.get("/tasks/{task_id}", response_model=schemas.TaskOut)
def read_task(task_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(auth.get_current_user)):
    db_task = crud.get_task(db, task_id=task_id, current_role=current_user.role, user_id=current_user.id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task


@app.put("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    task: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(auth.get_current_user),
):
    if task.owner_id is not None:
        if current_user.role != schemas.Role.manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers can change task assignment",
            )
        target_user = crud.get_user_by_id(db, task.owner_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="Assigned user not found")

    updated = crud.update_task(
        db,
        task_id=task_id,
        task_data=task,
        current_role=current_user.role,
        user_id=current_user.id,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Task not found or not owned by user")
    return updated


@app.delete("/tasks/{task_id}", response_model=schemas.TaskOut)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: schemas.TokenData = Depends(auth.get_current_user)):
    deleted = crud.delete_task(db, task_id=task_id, current_role=current_user.role, user_id=current_user.id)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Task not found or not owned by user")
    return deleted
