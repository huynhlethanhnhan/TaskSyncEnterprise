# 🛑 FILE: app/core/constants.py

# 🔑 Role Definitions
ROLE_ADMIN = 1
ROLE_MANAGER = 2
ROLE_EMPLOYEE = 3

ROLE_MAP = {
    ROLE_ADMIN: "admin",
    ROLE_MANAGER: "manager",
    ROLE_EMPLOYEE: "employee",
}

# 📋 Default Status Strings
DEFAULT_TASK_STATUS = "To Do"
DEFAULT_PROJECT_STATUS = "Planning"
DEFAULT_PROJECT_PRIORITY = "Medium"

# 🛡️ Regex Validation
EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

# 📁 Storage Validation Error Codes & Constants
MAX_AVATAR_SIZE_MB = 5
MAX_ATTACHMENT_SIZE_MB = 20

# 🩺 Database Core Settings
DB_SCHEMA = "dbo"
DB_CURRENT_TIMESTAMP_FUNC = "SYSUTCDATETIME()"
DEFAULT_DB_CONNECT_TIMEOUT = 3
