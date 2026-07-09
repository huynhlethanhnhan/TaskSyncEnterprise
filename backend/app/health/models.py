# 📂 FILE: app/health/models.py
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class LivenessResponse(BaseModel):
    """Schema representing application liveness state."""
    status: str = Field(..., description="Application status (e.g. UP)")
    uptime: str = Field(..., description="Uptime string representation")
    version: str = Field(..., description="Application release version")
    timestamp: str = Field(..., description="Timestamp in ISO UTC format")
    # Legacy fields to preserve backward compatibility
    checks: Dict[str, str] = Field(
        default_factory=lambda: {
            "process": "UP",
            "configuration": "UP",
            "logging": "UP"
        },
        description="Legacy checkpoints list dictionary"
    )


class DependencyStatus(BaseModel):
    """Schema representing health status of individual dependencies."""
    status: str = Field(..., description="Dependency status (UP or DOWN)")
    message: str = Field(..., description="Descriptive status message details")


class ReadinessResponse(BaseModel):
    """Schema representing application readiness and dependency checklist."""
    status: str = Field(..., description="Readiness status (UP or DOWN)")
    checks: Dict[str, DependencyStatus] = Field(..., description="Dictionary containing dependency check details")


class DetailedHealthResponse(BaseModel):
    """Detailed health status schema aggregating runtime and system diagnostics."""
    status: str = Field(..., description="Detailed overall status (UP or DOWN)")
    application: Dict[str, Any] = Field(..., description="Application state parameters")
    database: Dict[str, Any] = Field(..., description="Database connection states")
    storage: Dict[str, Any] = Field(..., description="Storage paths states")
    configuration: Dict[str, Any] = Field(..., description="Configurations status")
    environment: Dict[str, Any] = Field(..., description="Execution environment context parameters")
    version: str = Field(..., description="Release version tag")
    build_info: Optional[Dict[str, Any]] = Field(default=None, description="Build details metadata")
    startup_time: str = Field(..., description="Startup time in ISO format")
    current_uptime: str = Field(..., description="Current server uptime string")
    
    # Legacy fields to preserve backward compatibility
    application_name: str = Field(default="TaskSyncEnterprise", description="Legacy application name key")
    server_uptime: str = Field(..., description="Legacy formatted uptime string key")
    uptime_seconds: float = Field(..., description="Legacy uptime duration in seconds key")
    metrics: Dict[str, Any] = Field(..., description="Legacy server statistics reports metrics")
    diagnostics: Optional[Dict[str, Any]] = Field(default=None, description="Legacy detailed runtime diagnostic configurations")
