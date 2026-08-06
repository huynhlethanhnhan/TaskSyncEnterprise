# 📂 FILE: app/cache/cache_invalidator.py
import logging
from app.cache import cache_keys

logger = logging.getLogger("cache")


class CacheInvalidator:
    """
    Centralized Cache Invalidation Manager.
    Evicts related cache keys/patterns on write operations to ensure consistency.
    Fails silent: logs warnings/errors on failures and never raises/rolls back DB transactions.
    """

    @classmethod
    def _get_service(cls):
        """Lazily imports the cache_service instance to prevent circular import issues on startup."""
        from app.cache import cache_service

        return cache_service

    @classmethod
    def _check_redis_ready(cls) -> bool:
        """Helper to verify if Redis client is available, logging a warning if not."""
        service = cls._get_service()
        client = service._get_client()
        if client is None:
            logger.warning(
                "Cache Bypass",
                extra={"operation": "BYPASS", "reason": "Redis is unavailable"},
            )
            return False
        return True

    @classmethod
    def _publish(cls, event: str, entity_id: int | None = None, **context) -> None:
        """Notify open browser sessions after the database commit."""
        try:
            from app.services.notification.websocket_manager import websocket_manager

            payload = {"event": event, "entity_id": entity_id, **context}
            websocket_manager.broadcast_threadsafe(payload)
        except Exception as error:
            logger.warning(
                "Realtime event skipped",
                extra={"event": event, "entity_id": entity_id, "error": str(error)},
            )

    @classmethod
    def invalidate_employee(cls, employee_id: int | None = None) -> None:
        """Evicts cache keys related to employees."""
        cls._publish("employee.changed", employee_id)
        if not cls._check_redis_ready():
            return

        try:
            service = cls._get_service()
            # 1. Invalidate specific employee profile
            if employee_id is not None:
                key = cache_keys.get_employee_key(employee_id)
                if service.delete(key):
                    logger.info(
                        "Cache Invalidated",
                        extra={"operation": "INVALIDATE", "key": key},
                    )

            # 2. Invalidate employee lists
            pattern_list = cache_keys.get_employee_list_pattern()
            service.clear_pattern(pattern_list)
            logger.info(
                "Pattern Deleted",
                extra={"operation": "PATTERN_DELETE", "pattern": pattern_list},
            )

            # 3. Invalidate employee search
            pattern_search = cache_keys.get_employee_search_pattern()
            service.clear_pattern(pattern_search)
            logger.info(
                "Pattern Deleted",
                extra={"operation": "PATTERN_DELETE", "pattern": pattern_search},
            )

            # 4. Invalidate department lists (e.g. employee count changes)
            dept_list_pattern = cache_keys.get_department_list_pattern()
            service.clear_pattern(dept_list_pattern)
            logger.info(
                "Pattern Deleted",
                extra={"operation": "PATTERN_DELETE", "pattern": dept_list_pattern},
            )

            # 5. Invalidate dashboard stats
            cls.invalidate_dashboard()

        except Exception as e:
            logger.error(
                "Invalidation Failed",
                extra={"operation": "INVALIDATE_FAILED", "error": str(e)},
                exc_info=True,
            )

    @classmethod
    def invalidate_department(cls, department_id: int | None = None) -> None:
        """Evicts cache keys related to departments."""
        cls._publish("department.changed", department_id)
        if not cls._check_redis_ready():
            return

        try:
            service = cls._get_service()
            # 1. Invalidate specific department detail
            if department_id is not None:
                key = cache_keys.get_department_key(department_id)
                if service.delete(key):
                    logger.info(
                        "Cache Invalidated",
                        extra={"operation": "INVALIDATE", "key": key},
                    )

            # 2. Invalidate department lists
            pattern_list = cache_keys.get_department_list_pattern()
            service.clear_pattern(pattern_list)
            logger.info(
                "Pattern Deleted",
                extra={"operation": "PATTERN_DELETE", "pattern": pattern_list},
            )

            # 3. Invalidate dashboard stats
            cls.invalidate_dashboard()
        except Exception as e:
            logger.error(
                "Invalidation Failed",
                extra={"operation": "INVALIDATE_FAILED", "error": str(e)},
                exc_info=True,
            )

    @classmethod
    def invalidate_team(cls, team_id: int | None = None) -> None:
        """Evicts cache keys related to teams."""
        cls._publish("team.changed", team_id)
        if not cls._check_redis_ready():
            return

        try:
            service = cls._get_service()
            # 1. Invalidate specific team detail
            if team_id is not None:
                key = cache_keys.get_team_key(team_id)
                if service.delete(key):
                    logger.info(
                        "Cache Invalidated",
                        extra={"operation": "INVALIDATE", "key": key},
                    )

            # 2. Invalidate team list pages
            pattern_list = cache_keys.get_team_list_pattern()
            service.clear_pattern(pattern_list)
            logger.info(
                "Pattern Deleted",
                extra={"operation": "PATTERN_DELETE", "pattern": pattern_list},
            )

            # 3. Department list caches embed team counts — invalidate those too
            dept_list_pattern = cache_keys.get_department_list_pattern()
            service.clear_pattern(dept_list_pattern)
            logger.info(
                "Pattern Deleted",
                extra={"operation": "PATTERN_DELETE", "pattern": dept_list_pattern},
            )

            # 4. Invalidate dashboard stats
            cls.invalidate_dashboard()

        except Exception as e:
            logger.error(
                "Invalidation Failed",
                extra={"operation": "INVALIDATE_FAILED", "error": str(e)},
                exc_info=True,
            )

    @classmethod
    def invalidate_project(cls, project_id: int | None = None) -> None:
        """Evicts cache keys related to projects."""
        cls._publish("project.changed", project_id)
        if not cls._check_redis_ready():
            return

        try:
            service = cls._get_service()
            # 1. Invalidate specific project detail
            if project_id is not None:
                key = cache_keys.get_project_key(project_id)
                if service.delete(key):
                    logger.info(
                        "Cache Invalidated",
                        extra={"operation": "INVALIDATE", "key": key},
                    )

            # 2. Invalidate project lists
            pattern_list = cache_keys.get_project_list_pattern()
            service.clear_pattern(pattern_list)
            logger.info(
                "Pattern Deleted",
                extra={"operation": "PATTERN_DELETE", "pattern": pattern_list},
            )

            # 3. Invalidate dashboard stats
            cls.invalidate_dashboard()
        except Exception as e:
            logger.error(
                "Invalidation Failed",
                extra={"operation": "INVALIDATE_FAILED", "error": str(e)},
                exc_info=True,
            )

    @classmethod
    def invalidate_role(cls, role_id: int | None = None) -> None:
        """Evicts cache keys related to roles."""
        cls._publish("role.changed", role_id)
        if not cls._check_redis_ready():
            return

        try:
            service = cls._get_service()
            # 1. Invalidate specific role detail
            if role_id is not None:
                key = cache_keys.get_role_key(role_id)
                if service.delete(key):
                    logger.info(
                        "Cache Invalidated",
                        extra={"operation": "INVALIDATE", "key": key},
                    )

            # 2. Invalidate static roles list
            role_list_key = cache_keys.get_role_list_key()
            if service.delete(role_list_key):
                logger.info(
                    "Cache Invalidated",
                    extra={"operation": "INVALIDATE", "key": role_list_key},
                )
        except Exception as e:
            logger.error(
                "Invalidation Failed",
                extra={"operation": "INVALIDATE_FAILED", "error": str(e)},
                exc_info=True,
            )

    @classmethod
    def invalidate_task(
        cls,
        task_id: int | None = None,
        project_id: int | None = None,
        employee_id: int | None = None,
        sprint_id: int | None = None,
    ) -> None:
        """Evicts cache keys related to tasks, including associated project and employee summaries."""
        cls._publish(
            "task.changed",
            task_id,
            project_id=project_id,
            employee_id=employee_id,
            sprint_id=sprint_id,
        )
        if not cls._check_redis_ready():
            return

        try:
            service = cls._get_service()
            # 1. Invalidate specific task detail
            if task_id is not None:
                key = cache_keys.get_task_key(task_id)
                if service.delete(key):
                    logger.info(
                        "Cache Invalidated",
                        extra={"operation": "INVALIDATE", "key": key},
                    )
            else:
                # Task responses embed assignee metadata such as avatar_url.
                # Employee-level changes must evict both lists and detail entries.
                service.clear_pattern("task:*")

            # 2. Invalidate task lists
            pattern_list = cache_keys.get_task_list_pattern()
            service.clear_pattern(pattern_list)
            logger.info(
                "Pattern Deleted",
                extra={"operation": "PATTERN_DELETE", "pattern": pattern_list},
            )

            # 3. Relationship-aware project cache invalidation
            if project_id is not None:
                cls.invalidate_project(project_id)
            else:
                proj_list_pattern = cache_keys.get_project_list_pattern()
                service.clear_pattern(proj_list_pattern)
                logger.info(
                    "Pattern Deleted",
                    extra={"operation": "PATTERN_DELETE", "pattern": proj_list_pattern},
                )

            # 4. Relationship-aware employee workload cache invalidation
            if employee_id is not None:
                cls.invalidate_employee(employee_id)
            else:
                emp_list_pattern = cache_keys.get_employee_list_pattern()
                service.clear_pattern(emp_list_pattern)
                logger.info(
                    "Pattern Deleted",
                    extra={"operation": "PATTERN_DELETE", "pattern": emp_list_pattern},
                )

            # 5. Invalidate dashboard stats
            if sprint_id is not None:
                cls.invalidate_sprint(sprint_id, project_id=project_id)

            # 6. Invalidate dashboard stats
            cls.invalidate_dashboard()

        except Exception as e:
            logger.error(
                "Invalidation Failed",
                extra={"operation": "INVALIDATE_FAILED", "error": str(e)},
                exc_info=True,
            )

    @classmethod
    def invalidate_sprint(
        cls,
        sprint_id: int | None = None,
        *,
        project_id: int | None = None,
    ) -> None:
        cls._publish("sprint.changed", sprint_id, project_id=project_id)
        if not cls._check_redis_ready():
            return
        try:
            service = cls._get_service()
            if sprint_id is not None:
                service.delete(cache_keys.get_sprint_key(sprint_id))
            service.clear_pattern(cache_keys.get_sprint_list_pattern())
            service.clear_pattern(cache_keys.get_sprint_planning_pattern(sprint_id))
            service.clear_pattern(cache_keys.get_backlog_list_pattern(project_id))
            if project_id is not None:
                cls.invalidate_project(project_id)
            cls.invalidate_dashboard()
        except Exception as e:
            logger.error(
                "Invalidation Failed",
                extra={"operation": "INVALIDATE_FAILED", "error": str(e)},
                exc_info=True,
            )

    @classmethod
    def invalidate_backlog(
        cls,
        *,
        project_id: int,
        sprint_id: int | None = None,
    ) -> None:
        cls._publish(
            "backlog.changed",
            None,
            project_id=project_id,
            sprint_id=sprint_id,
        )
        if not cls._check_redis_ready():
            return
        try:
            service = cls._get_service()
            service.clear_pattern(cache_keys.get_backlog_list_pattern(project_id))
            if sprint_id is not None:
                cls.invalidate_sprint(sprint_id, project_id=project_id)
            else:
                cls.invalidate_project(project_id)
        except Exception as e:
            logger.error(
                "Invalidation Failed",
                extra={"operation": "INVALIDATE_FAILED", "error": str(e)},
                exc_info=True,
            )

    @classmethod
    def invalidate_topic(cls, topic_id: int | None = None) -> None:
        """Refresh topic lists and details in every connected browser."""
        cls._publish("topic.changed", topic_id)

    @classmethod
    def invalidate_feedback(cls, feedback_id: int | None = None) -> None:
        """Refresh feedback views and dashboard counters in every browser."""
        cls._publish("feedback.changed", feedback_id)
        cls.invalidate_dashboard()

    @classmethod
    def invalidate_file(cls, file_id: int | None = None) -> None:
        """Refresh the shared file registry in every connected browser."""
        cls._publish("file.changed", file_id)

    @classmethod
    def invalidate_vacation(cls, vacation_id: int | None = None) -> None:
        """Refresh leave requests, calendar data, and dashboard counters."""
        cls._publish("vacation.changed", vacation_id)
        cls.invalidate_dashboard()

    @classmethod
    def invalidate_dashboard(cls) -> None:
        """Evicts cache keys related to the dashboard overview and analytics."""
        if not cls._check_redis_ready():
            return

        try:
            service = cls._get_service()
            service.clear_pattern("dashboard:*")
            logger.info(
                "Pattern Deleted",
                extra={"operation": "PATTERN_DELETE", "pattern": "dashboard:*"},
            )
        except Exception as e:
            logger.error(
                "Invalidation Failed",
                extra={"operation": "INVALIDATE_FAILED", "error": str(e)},
                exc_info=True,
            )

