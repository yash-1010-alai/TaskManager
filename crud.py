from sqlalchemy.orm import Session, joinedload

import models, schemas


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, user: schemas.UserCreate, hashed_password: str, role: schemas.Role = schemas.Role.member):
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        role=role.value,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


def update_user_role(db: Session, user_id: int, role: schemas.Role):
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    db_user.role = role.value
    db.commit()
    db.refresh(db_user)
    return db_user


def get_tasks(
    db: Session,
    user_id: int,
    current_role: schemas.Role,
    status: schemas.TaskStatus | None = None,
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(models.Task).options(joinedload(models.Task.owner))
    if current_role == schemas.Role.member:
        query = query.filter(models.Task.owner_id == user_id)
    if status is not None:
        query = query.filter(models.Task.status == status.value)
    return query.offset(skip).limit(limit).all()


def get_task(db: Session, task_id: int, current_role: schemas.Role, user_id: int):
    query = db.query(models.Task).filter(models.Task.id == task_id)
    if current_role == schemas.Role.member:
        query = query.filter(models.Task.owner_id == user_id)
    return query.first()


def create_task(db: Session, task: schemas.TaskCreate, user_id: int):
    task_data = task.dict(exclude_unset=True)
    task_data["owner_id"] = user_id
    db_task = models.Task(**task_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(db: Session, task_id: int, task_data: schemas.TaskUpdate, current_role: schemas.Role, user_id: int):
    db_task = get_task(db, task_id, current_role, user_id)
    if db_task is None:
        return None
    for field, value in task_data.dict(exclude_unset=True).items():
        setattr(db_task, field, value)
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: int, current_role: schemas.Role, user_id: int):
    db_task = get_task(db, task_id, current_role, user_id)
    if db_task is None:
        return None
    db.delete(db_task)
    db.commit()
    return db_task
