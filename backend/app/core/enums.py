from enum import Enum


class TaskStatus(str, Enum):

    TODO = "To Do"

    IN_PROGRESS = "In Progress"

    DONE = "Done"


class ProjectStatus(str, Enum):

    PLANNING = "Planning"

    ACTIVE = "Active"

    COMPLETED = "Completed"


class NotificationType(str, Enum):
    AUTHENTICATION = "AUTHENTICATION"
    TASKS = "TASKS"
    PROJECTS = "PROJECTS"
    VACATION = "VACATION"
    COMMENTS = "COMMENTS"
    SYSTEM = "SYSTEM"


class NotificationPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class NotificationStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SENT = "SENT"
    FAILED = "FAILED"
    READ = "READ"
    ARCHIVED = "ARCHIVED"


class NotificationChannel(str, Enum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    WEBSOCKET = "WEBSOCKET"
    PUSH = "PUSH"
    SMS = "SMS"
    SLACK = "SLACK"
    TEAMS = "TEAMS"
    SYSTEM = "SYSTEM"