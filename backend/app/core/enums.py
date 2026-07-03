from enum import Enum


class TaskStatus(str, Enum):

    TODO = "To Do"

    IN_PROGRESS = "In Progress"

    DONE = "Done"


class ProjectStatus(str, Enum):

    PLANNING = "Planning"

    ACTIVE = "Active"

    COMPLETED = "Completed"