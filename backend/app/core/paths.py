# 📂 FILE: app/core/paths.py
from pathlib import Path
import tempfile

# Resolve project root directory (TaskSyncEnterprise/backend)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

def resolve_path(path_str: str) -> Path:
    """
    Resolves an absolute path.
    If the path is relative, resolves it relative to the PROJECT_ROOT.
    """
    path = Path(path_str)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return path.resolve()

# Centralized paths
TEMP_DIR = Path(tempfile.gettempdir())
