# 📂 FILE: app/schemas/checklist.py
from pydantic import BaseModel, ConfigDict


class TaskChecklistBase(BaseModel):
    title: str
    is_completed: bool = False


class TaskChecklistCreate(TaskChecklistBase):
    pass


class TaskChecklistUpdate(BaseModel):
    title: str | None = None
    is_completed: bool | None = None


class TaskChecklistResponse(TaskChecklistBase):
    id: int
    task_id: int

    model_config = ConfigDict(from_attributes=True)
