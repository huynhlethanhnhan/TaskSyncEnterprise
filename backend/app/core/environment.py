# 📂 FILE: app/core/environment.py
import os

class EnvironmentDetection:
    """Provides utility methods for runtime environment profile detection."""
    
    @property
    def current(self) -> str:
        """Returns the current ENVIRONMENT value in lowercase."""
        return os.environ.get("ENVIRONMENT", "development").lower()

    @property
    def is_development(self) -> bool:
        """Checks if the current environment is local development."""
        return self.current == "development"

    @property
    def is_testing(self) -> bool:
        """Checks if the current environment is unit/integration testing."""
        return self.current == "testing"

    @property
    def is_production(self) -> bool:
        """Checks if the current environment is production."""
        return self.current == "production"

    @property
    def is_debug(self) -> bool:
        """Checks if debug logging or debugging modes should be enabled."""
        return self.is_development or self.is_testing or os.environ.get("DEBUG", "").lower() in ("true", "1")

# Singleton instance
env_detect = EnvironmentDetection()
