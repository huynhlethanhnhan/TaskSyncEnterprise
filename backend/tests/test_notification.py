# 🧪 TEST NOTIFICATION MODULE
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.employee import Employee
from app.models.notification import Notification
from app.crud import notification as notification_crud


def run_test():
    print("--- START NOTIFICATION DIAGNOSTIC TEST ---")
    db = SessionLocal()
    try:
        # 1. Tìm nhân viên employee@gmail.com để test
        user = db.query(Employee).filter_by(email="employee@gmail.com").first()
        if not user:
            print("[FAIL] Cannot find employee@gmail.com in database.")
            return
        print(f"[INFO] Testing for employee: {user.full_name} (ID: {user.id})")

        # 2. Tạo một thông báo mới
        title = "Test Title 2026"
        message = "Test Message Content for Agile Project Architecture"
        new_noti = notification_crud.create(
            db, title=title, message=message, employee_id=user.id
        )
        print(
            f"[PASS] Created new notification. ID: {new_noti.id}, Title: '{new_noti.title}', is_read: {new_noti.is_read}"
        )

        # 3. Lấy danh sách thông báo của nhân viên và kiểm tra
        notis = notification_crud.get_by_employee(db, employee_id=user.id)
        found = False
        for n in notis:
            if n.id == new_noti.id:
                found = True
                break

        if found:
            print(
                f"[PASS] Successfully retrieved notification with ID {new_noti.id} from employee's notifications list."
            )
        else:
            print(
                f"[FAIL] Notification with ID {new_noti.id} not found in employee's notifications list."
            )

        # 4. Đánh dấu đã đọc
        updated_noti = notification_crud.mark_as_read(db, notification=new_noti)
        print(
            f"[PASS] Marked as read. ID: {updated_noti.id}, is_read: {updated_noti.is_read}"
        )
        assert updated_noti.is_read is True

        # 5. Dọn dẹp dữ liệu test
        db.delete(updated_noti)
        db.commit()
        print("[PASS] Test notification deleted successfully (Database cleaned up).")

        print("--- ALL DIAGNOSTIC TESTS PASSED SUCCESSFULLY! ---")
    except Exception as e:
        print(f"[FAIL] Diagnostic test failed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    run_test()
