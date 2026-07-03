from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.core.security import (
    verify_password,
    create_access_token
)


def login(
        db:Session,
        email:str,
        password:str):

    user=db.query(Employee)\
        .filter(Employee.email==email)\
        .first()

    if not user:
        return None

    if not verify_password(
            password,
            user.password_hash):

        return None

    token=create_access_token(
        {
            "sub":str(user.id),
            "email":user.email,
            "role":user.role_id
        }
    )

    return token