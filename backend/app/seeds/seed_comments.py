import random
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.employee import Employee

COMMENT_TEMPLATES = [
    "Đã cập nhật tiến độ công việc theo đúng kế hoạch Sprint.",
    "Cần bổ sung thêm tài liệu thiết kế giao diện chi tiết trước khi tiến hành code.",
    "Đã kiểm tra lại trên môi trường Staging, chức năng hoạt động ổn định.",
    "Phát hiện lỗi xung đột dữ liệu khi gọi API, cần thảo luận lại với backend team.",
    "Đã hoàn thành phần lớn yêu cầu, còn lại một vài case biên đang xử lý nốt.",
    "Yêu cầu bổ sung thêm test cases cho quy trình phê duyệt.",
    "Đồng ý với phương án kỹ thuật này. Hãy cập nhật code lên nhánh develop.",
    "Đã review code và chấp nhận Pull Request thành công.",
]


def seed_comments(db: Session, tasks: list[Task], employees: list[Employee]) -> int:
    random.seed(2026)
    count = 0
    for idx, task in enumerate(tasks):
        if idx % 2 == 0 or (task.title and task.title.startswith("EMP001")):
            num_comments = random.randint(1, 3)
            for _ in range(num_comments):
                author = random.choice(employees)
                content = random.choice(COMMENT_TEMPLATES)
                comment = TaskComment(
                    task_id=task.id,
                    employee_id=author.id,
                    content=content,
                )
                db.add(comment)
                count += 1
    db.commit()
    return count
