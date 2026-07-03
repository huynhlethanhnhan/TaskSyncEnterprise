from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "online",
            "database": "online",
            "message": "Database connection is healthy",
        }
    except SQLAlchemyError as exc:
        return {
            "status": "offline",
            "database": "offline",
            "message": str(exc),
        }