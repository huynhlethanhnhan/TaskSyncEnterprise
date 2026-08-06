from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.team import Team


def seed_teams(db: Session, departments: list[Department]) -> list[Team]:
    teams: list[Team] = []
    for department in departments:
        team_code = f"{department.department_code}-TEAM-01"
        team = db.query(Team).filter_by(team_code=team_code).first()
        if team is None:
            team = Team(
                team_code=team_code,
                name=f"{department.name} Team",
                department_id=department.id,
                is_active=True,
            )
            db.add(team)
            db.commit()
            db.refresh(team)
        teams.append(team)
    return teams
