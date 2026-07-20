# 📂 FILE: app/services/notification/formatter.py
from typing import Dict, Any, Tuple
from app.core.enums import NotificationType


class NotificationFormatter:
    """Formatter responsible for generating formatted titles and messages from event context payloads."""

    @staticmethod
    def format(
        event_type: NotificationType, payload: Dict[str, Any]
    ) -> Tuple[str, str]:
        """
        Generates (title, message) tuple formatted using context interpolation.
        Supports plain text formatting.
        """
        title_template = ""
        message_template = ""

        if event_type == NotificationType.TASKS:
            title_template = "Task Assigned: {task_title}"
            message_template = (
                "You have been assigned to the task '{task_title}' by {actor_name}."
            )
        elif event_type == NotificationType.VACATION:
            status = payload.get("status", "UPDATED")
            title_template = f"Vacation Request {status.capitalize()}"
            message_template = "Your vacation request from {start_date} to {end_date} has been {status_lower}."
        elif event_type == NotificationType.COMMENTS:
            title_template = "New Comment on Task: {task_title}"
            message_template = "{actor_name} added a comment: '{comment_body}'"
        elif event_type == NotificationType.AUTHENTICATION:
            title_template = "Security Alert: New Login"
            message_template = "A new login was detected for your account on {login_time} from IP {ip_address}."
        elif event_type == NotificationType.PROJECTS:
            title_template = "Project Updated: {project_name}"
            message_template = (
                "The project '{project_name}' has been updated to status: {status}."
            )
        else:
            # SYSTEM or fallback
            title_template = "{subject}"
            message_template = "{body}"

        # Safe formatting helper class to avoid KeyErrors with incomplete payloads
        class SafeDict(dict):
            def __missing__(self, key):
                return f"{{{key}}}"

        # Setup context dictionary
        fmt_ctx = SafeDict(payload)

        # Helper dynamic lowercasing
        if "status" in payload:
            fmt_ctx["status_lower"] = str(payload["status"]).lower()

        title = title_template.format_map(fmt_ctx)
        message = message_template.format_map(fmt_ctx)

        return title, message
