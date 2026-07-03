from sqlalchemy.orm import Session
from sqlalchemy import select


class BaseRepository:

    def __init__(self, model):
        self.model = model

    def get_all(
            self,
            db: Session,
            skip=0,
            limit=20):

        stmt = (
            select(self.model)
            .offset(skip)
            .limit(limit)
        )

        return db.scalars(stmt).all()

    def get_by_id(
            self,
            db: Session,
            obj_id: int):

        return db.get(
            self.model,
            obj_id
        )

    def create(
            self,
            db: Session,
            obj):

        db.add(obj)
        db.commit()
        db.refresh(obj)

        return obj

    def delete(
            self,
            db: Session,
            obj):

        db.delete(obj)
        db.commit()