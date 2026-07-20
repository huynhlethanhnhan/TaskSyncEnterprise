# 🧪 TEST DEPS DIAGNOSTIC
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.employee import Employee
from app.core.deps import get_current_user, require_roles
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE


def run_diag():
    db = SessionLocal()
    # Let's find user employee@gmail.com
    user = db.query(Employee).filter_by(email="employee@gmail.com").first()
    print(f"User email: {user.email}")
    print(f"User role_id: {user.role_id} (Type: {type(user.role_id).__name__})")

    allowed = [ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE]
    print(f"Allowed roles: {allowed}")
    print(f"Is user.role_id in allowed? {user.role_id in allowed}")

    # Check if require_roles raises exception
    checker = require_roles(allowed)
    try:
        checker(user)
        print("Checker result: Access Granted!")
    except Exception as e:
        print(f"Checker result: Access Denied! Exception: {e}")

    db.close()


if __name__ == "__main__":
    run_diag()
