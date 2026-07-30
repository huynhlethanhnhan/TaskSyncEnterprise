from pydantic import BaseModel


class DepartmentTransferRequest(BaseModel):
    target_department_id: int


class TeamTransferRequest(BaseModel):
    target_team_id: int


class MembershipChangeResponse(BaseModel):
    message: str
    employee_id: int
    department_id: int | None = None
    team_id: int | None = None


class MembershipTargetResponse(BaseModel):
    id: int
    name: str
