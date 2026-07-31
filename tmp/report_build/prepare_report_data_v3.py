from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(r"E:\TaskSyncEnterprise")
JIRA_ROWS = ROOT / "tmp" / "report_build" / "jira_rows.json"
OUTPUT = ROOT / "tmp" / "report_build" / "report_data_v3.json"

EPICS = {
    "EP01": "Xác thực và kiểm soát truy cập",
    "EP02": "Quản lý hồ sơ nhân viên",
    "EP03": "Quản lý cơ cấu phòng ban",
    "EP04": "Quản lý dự án và phân bổ nhóm",
    "EP05": "Vòng đời công việc và bảng Kanban",
    "EP06": "Cộng tác nhóm",
    "EP07": "Quản lý tài liệu và tệp",
    "EP08": "Quản lý nghỉ phép",
    "EP09": "Quản lý làm thêm giờ",
    "EP10": "Thông báo đa kênh",
    "EP11": "Phân tích hiệu suất và báo cáo",
    "EP12": "Vận hành, kiểm toán và an toàn hệ thống",
}

TITLE_VI = {
    "Secure User Login": "Đăng nhập người dùng an toàn",
    "Automatic Session Renewal": "Tự động gia hạn phiên đăng nhập",
    "Role Definition Layout": "Thiết lập danh mục vai trò",
    "Role-Based Access Enforcement": "Kiểm soát truy cập theo vai trò",
    "Employee Profile Creation": "Tạo hồ sơ nhân viên",
    "Bulk Employee Data Import": "Nhập danh sách nhân viên hàng loạt",
    "Direct Manager Assignment": "Gán người quản lý trực tiếp",
    "Department Structure Setup": "Thiết lập cơ cấu phòng ban",
    "Department Head Assignment": "Bổ nhiệm trưởng phòng",
    "Department Transfer Approval Flow": "Phê duyệt chuyển phòng ban",
    "Project Creation Wizard": "Tạo dự án theo các bước hướng dẫn",
    "Project Team Assignment Table": "Phân công thành viên vào dự án",
    "Project Milestone Tracking": "Theo dõi cột mốc dự án",
    "Task Creation Editor": "Tạo và chỉnh sửa công việc",
    "Task Kanban Board": "Theo dõi công việc trên bảng Kanban",
    "Task Dependency Diagram": "Theo dõi quan hệ phụ thuộc công việc",
    "Advanced Backlog Filtering": "Lọc danh sách yêu cầu nâng cao",
    "Task Decomposition": "Phân rã yêu cầu thành công việc nhỏ",
    "Collaborative Comments Feed": "Trao đổi bằng luồng bình luận",
    "User Mention Notifications": "Thông báo khi người dùng được nhắc tên",
    "Task Attachment Security": "Bảo vệ tệp đính kèm công việc",
    "Bulk Document Downloader": "Tải nhiều tài liệu cùng lúc",
    "Unused Files Cleanup": "Dọn dẹp tệp không còn sử dụng",
    "Leave Request Submission": "Gửi yêu cầu nghỉ phép",
    "Leave Approvals Panel": "Phê duyệt yêu cầu nghỉ phép",
    "Annual Leave Balance Accrual": "Tính số dư phép năm",
    "Emergency Leave Cancellation": "Hủy yêu cầu nghỉ khẩn cấp",
    "Overtime Request Submission": "Gửi yêu cầu làm thêm giờ",
    "Overtime Approvals Panel": "Phê duyệt yêu cầu làm thêm giờ",
    "Overtime Policy Validation": "Kiểm tra quy định làm thêm giờ",
    "Real-Time In-App Alerts": "Nhận cảnh báo thời gian thực",
    "Notification Channel Settings": "Cài đặt kênh nhận thông báo",
    "Daily Summary Email Digest": "Nhận email tổng hợp hằng ngày",
    "Failed Notification Retry": "Gửi lại thông báo thất bại",
    "Operational Performance Dashboard": "Theo dõi bảng điều khiển hiệu suất",
    "Department Resource Allocation Map": "Theo dõi phân bổ nguồn lực phòng ban",
    "Custom Project Report Generator": "Tạo báo cáo dự án tùy chỉnh",
    "Project Burnup Predictor": "Dự báo tiến độ hoàn thành dự án",
}

EPIC_BY_KEY = {}
for start, end, epic in [
    (14, 17, "EP01"),
    (18, 20, "EP02"),
    (21, 23, "EP03"),
    (24, 26, "EP04"),
    (27, 31, "EP05"),
    (32, 33, "EP06"),
    (34, 36, "EP07"),
    (37, 40, "EP08"),
    (41, 43, "EP09"),
    (44, 47, "EP10"),
    (48, 51, "EP11"),
]:
    for number in range(start, end + 1):
        EPIC_BY_KEY[f"JD-{number}"] = epic

SPRINT_1_JIRA = {
    "JD-14", "JD-15", "JD-16", "JD-17", "JD-18", "JD-23", "JD-24", "JD-25",
    "JD-27", "JD-28", "JD-29", "JD-30", "JD-31", "JD-32", "JD-33", "JD-34",
    "JD-35", "JD-44",
}

VERIFIED = {
    "JD-14": "Hoàn thành và có thể demo",
    "JD-15": "Hoàn thành phần chính",
    "JD-16": "Hoàn thành phần chính",
    "JD-17": "Hoàn thành phần chính",
    "JD-18": "Sơ khai tại cuối Sprint 1",
    "JD-23": "Hoàn thành theo mã nguồn, cần kiểm thử lại",
    "JD-24": "Hoàn thành phần chính theo mã nguồn",
    "JD-25": "Hoàn thành phần chính theo mã nguồn",
    "JD-27": "Hoàn thành phần chính theo mã nguồn",
    "JD-28": "Hoàn thành và có thể demo",
    "JD-29": "Có sơ đồ và mô hình phụ thuộc",
    "JD-30": "Đang hoàn thiện",
    "JD-31": "Chưa xác minh",
    "JD-32": "Hoàn thành phần chính theo mã nguồn",
    "JD-33": "Sơ khai",
    "JD-34": "Sơ khai",
    "JD-35": "Có mã nguồn, chưa xác minh bằng demo",
    "JD-44": "Hoàn thành phần chính theo mã nguồn",
}

ACTOR = {
    "EP01": "người dùng hệ thống",
    "EP02": "quản trị viên nhân sự",
    "EP03": "quản trị viên tổ chức",
    "EP04": "quản lý dự án",
    "EP05": "thành viên dự án",
    "EP06": "thành viên nhóm",
    "EP07": "người dùng dự án",
    "EP08": "nhân viên",
    "EP09": "nhân viên",
    "EP10": "người dùng hệ thống",
    "EP11": "người quản lý",
    "EP12": "người vận hành hệ thống",
}

BENEFIT = {
    "EP01": "truy cập đúng quyền và bảo vệ phiên làm việc",
    "EP02": "quản lý hồ sơ nhân sự nhất quán",
    "EP03": "duy trì cơ cấu tổ chức rõ ràng",
    "EP04": "lập kế hoạch và phân công nguồn lực minh bạch",
    "EP05": "theo dõi tiến độ công việc hiệu quả",
    "EP06": "trao đổi và phối hợp công việc thuận tiện",
    "EP07": "quản lý tài liệu an toàn và có thể truy vết",
    "EP08": "thực hiện quy trình nghỉ phép đúng quy định",
    "EP09": "thực hiện quy trình làm thêm giờ đúng quy định",
    "EP10": "nhận đúng thông tin vào đúng thời điểm",
    "EP11": "có dữ liệu hỗ trợ quyết định",
    "EP12": "duy trì hệ thống ổn định và có thể kiểm tra",
}


def parse_row(raw: str) -> dict:
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    key_index = next(i for i, value in enumerate(lines) if re.fullmatch(r"JD-\d+", value))
    key = lines[key_index]
    title = lines[key_index + 2]
    statuses = {"DONE", "IN PROGRESS", "TO DO"}
    status_index = next(i for i, value in enumerate(lines) if value in statuses)
    status = lines[status_index].title()
    priority = next((value for value in lines if value in {"Highest", "Medium", "Lowest"}), "Medium")
    assignee_candidates = lines[key_index + 3:status_index]
    assignee = next(
        (
            value
            for value in assignee_candidates
            if value not in {"Unresolved", "Done", "Copy link", "Highest", "Medium", "Lowest"}
        ),
        "Chưa giao",
    )
    if assignee == "Unassigned":
        assignee = "Chưa giao"
    return {"key": key, "title_en": title, "jira_status": status, "priority_en": priority, "jira_assignee": assignee}


def story_points(title: str, epic: str) -> int:
    lower = title.lower()
    if any(word in lower for word in ("dự báo", "thời gian thực", "phê duyệt", "phân bổ", "nhập danh sách")):
        return 8
    if epic in {"EP01", "EP05", "EP10", "EP12"}:
        return 5
    return 3


def verified_owner(item: dict) -> str:
    title = item["title_en"]
    if title == "Automatic Session Renewal":
        return "Huỳnh Lê Thành Nhân (chính); Nguyễn Đức Mạnh (kiểm thử)"
    if title in {"Real-Time In-App Alerts", "Notification Channel Settings"}:
        return "Huỳnh Lê Thành Nhân (chính); Nguyễn Đức Mạnh (hỗ trợ kiểm thử)"
    if item["jira_assignee"] == "2311554285":
        return "Huỳnh Lê Thành Nhân (mã nguồn); Nguyễn Lê Huy Hoàng (cần xác minh kiểm thử)"
    if item["jira_assignee"] == "Phạm Tuấn Anh":
        return "Phạm Tuấn Anh được giao trên Jira; chưa có sản phẩm bàn giao để xác minh"
    return "Huỳnh Lê Thành Nhân"


def acceptance(title: str) -> str:
    return (
        f"Chức năng “{title}” xử lý được dữ liệu hợp lệ; trường hợp sai dữ liệu hoặc sai quyền có thông báo rõ ràng; "
        "dữ liệu lưu nhất quán và có thể kiểm tra lại bằng mã nguồn, kiểm thử hoặc giao diện."
    )


def main() -> None:
    raw_rows = json.loads(JIRA_ROWS.read_text(encoding="utf-8"))
    jira_items = [parse_row(row) for row in raw_rows if re.search(r"\bJD-(?:1[4-9]|[2-4]\d|5[01])\b", row)]
    backlog = []
    for index, item in enumerate(jira_items, 1):
        key = item["key"]
        epic = EPIC_BY_KEY[key]
        title_vi = TITLE_VI[item["title_en"]]
        sprint = "Sprint 1" if key in SPRINT_1_JIRA else "Sprint 2"
        verified = VERIFIED.get(key, "Kế hoạch hoặc thực hiện sau ngày 23/07/2026")
        source_note = "Jira"
        if key in {"JD-18", "JD-20", "JD-21", "JD-19"}:
            source_note += "; Jira được cập nhật sau mốc kết thúc Sprint 1"
        backlog.append(
            {
                "id": f"US{index:02d}",
                "jira": key,
                "epic": epic,
                "epic_name": EPICS[epic],
                "title": title_vi,
                "title_en": item["title_en"],
                "user_story": f"Là {ACTOR[epic]}, tôi muốn {title_vi.lower()} để {BENEFIT[epic]}.",
                "priority": {"Highest": "Cao", "Medium": "Trung bình", "Lowest": "Thấp"}[item["priority_en"]],
                "sp": story_points(title_vi, epic),
                "sprint": sprint,
                "jira_status": item["jira_status"].replace("Done", "Hoàn thành").replace("In Progress", "Đang thực hiện").replace("To Do", "Cần làm"),
                "verified_status": verified,
                "jira_assignee": "Nguyễn Lê Huy Hoàng (?)" if item["jira_assignee"] == "2311554285" else item["jira_assignee"],
                "verified_owner": verified_owner(item),
                "acceptance": acceptance(title_vi),
                "source": source_note,
            }
        )

    derived = [
        ("Đăng xuất an toàn", "Secure Logout", "EP01", "Hoàn thành phần chính", "Git: auth/router và dịch vụ xác thực"),
        ("Xử lý phiên hết hạn", "Expired Session Handling", "EP01", "Hoàn thành phần chính", "Git: tokenService và AuthProvider"),
        ("Quản lý phiên đăng nhập", "Session Management", "EP01", "Hoàn thành phần chính", "Git: user_sessions và refresh_tokens"),
        ("Xem bảng điều khiển tổng quan", "Overview Dashboard", "EP11", "Sơ khai tại cuối Sprint 1", "Git: DashboardPage và dashboard API"),
        ("Xem lịch công việc", "Work Calendar", "EP05", "Hoàn thành phần chính", "Git: CalendarPage"),
        ("Đồng bộ lịch khi công việc thay đổi", "Calendar Event Refresh", "EP05", "Hoàn thành phần chính", "Git: domain-event và CalendarPage"),
        ("Xem trung tâm thông báo", "Notification Center", "EP10", "Hoàn thành phần chính", "Git: NotificationsPage và notification API"),
        ("Đánh dấu thông báo đã đọc", "Mark Notification Read", "EP10", "Hoàn thành phần chính", "Git: notification service"),
        ("Kiểm tra tình trạng hệ thống", "System Health Check", "EP12", "Hoàn thành", "Git 09-12/07: health checks"),
        ("Ghi nhật ký có cấu trúc", "Structured Logging", "EP12", "Hoàn thành", "Git 09-12/07: logging"),
        ("Sử dụng bộ nhớ đệm Redis", "Redis Caching", "EP12", "Hoàn thành phần nền tảng", "Git 11/07: cache manager"),
        ("Triển khai bằng Docker và kiểm tra CI", "Docker and CI Validation", "EP12", "Hoàn thành phần nền tảng", "Git 16-23/07: Docker/CI"),
    ]
    for title_vi, title_en, epic, verified, source in derived:
        index = len(backlog) + 1
        owner = "Huỳnh Lê Thành Nhân"
        if title_vi in {"Xem lịch công việc", "Đồng bộ lịch khi công việc thay đổi"}:
            owner += " (chính); Nguyễn Đức Mạnh (Calendar/hỗ trợ)"
        if "thông báo" in title_vi.lower():
            owner += " (chính); Nguyễn Đức Mạnh (hỗ trợ kiểm thử)"
        backlog.append(
            {
                "id": f"US{index:02d}",
                "jira": "",
                "epic": epic,
                "epic_name": EPICS[epic],
                "title": title_vi,
                "title_en": title_en,
                "user_story": f"Là {ACTOR[epic]}, tôi muốn {title_vi.lower()} để {BENEFIT[epic]}.",
                "priority": "Cao" if epic in {"EP01", "EP12"} else "Trung bình",
                "sp": story_points(title_vi, epic),
                "sprint": "Sprint 1",
                "jira_status": "Chưa tạo riêng trên Jira",
                "verified_status": verified,
                "jira_assignee": "",
                "verified_owner": owner,
                "acceptance": acceptance(title_vi),
                "source": source,
            }
        )

    payload = {
        "project": "TaskSyncEnterprise",
        "sprint_1": {"start": "2026-07-02", "end": "2026-07-23"},
        "sprint_2": {"start": "2026-07-24", "end": "2026-08-20", "status": "Dự kiến/tiếp tục xác minh"},
        "team": [
            {"name": "Huỳnh Lê Thành Nhân", "student_id": "2000004897", "role": "Product Owner / Full-stack Developer", "contribution": "Đóng góp chính"},
            {"name": "Nguyễn Đức Mạnh", "student_id": "2200010420", "role": "Scrum Master tạm thời / Hỗ trợ kiểm thử", "contribution": "Có đóng góp và hỗ trợ"},
            {"name": "Nguyễn Lê Huy Hoàng", "student_id": "2311554285", "role": "Hỗ trợ kiểm thử và demo", "contribution": "Hỗ trợ kiểm thử; cần xác minh từng hạng mục"},
            {"name": "Phạm Tuấn Anh", "student_id": "", "role": "Sơ đồ và tài liệu được phân công", "contribution": "Chưa có sản phẩm bàn giao để xác minh"},
            {"name": "Nguyễn Anh Tuấn", "student_id": "", "role": "Nghiên cứu tài liệu được phân công", "contribution": "Chưa có sản phẩm bàn giao để xác minh"},
        ],
        "epics": EPICS,
        "backlog": backlog,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT} with {len(backlog)} user stories.")


if __name__ == "__main__":
    main()
