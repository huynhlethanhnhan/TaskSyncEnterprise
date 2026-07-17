import os
import pytest
from pydantic import SecretStr
from unittest.mock import patch, MagicMock

from app.core.settings import Settings
from app.core.validation import validate_security_settings
from app.logging.filters import mask_sensitive

class MockSettings:
    """Mock configuration class that implements properties checked by validate_security_settings."""
    def __init__(self, **kwargs):
        self.ENVIRONMENT = kwargs.get("ENVIRONMENT", "production")
        self.SECRET_KEY = SecretStr(kwargs.get("SECRET_KEY", "a_very_long_and_extremely_secure_key_12345"))
        self.BACKEND_CORS_ORIGINS = kwargs.get("BACKEND_CORS_ORIGINS", ["http://127.0.0.1:8080"])
        self.ALLOWED_HOSTS = kwargs.get("ALLOWED_HOSTS", ["127.0.0.1", "localhost", "backend"])
        self.SQLALCHEMY_DATABASE_URI = kwargs.get("SQLALCHEMY_DATABASE_URI", "mssql+pymssql://sa:password@sqlserver:1433/TaskSyncEnterprise")
        self.REDIS_URL = kwargs.get("REDIS_URL", "redis://redis:6379/0")
        self.DEFAULT_PAGE_SIZE = 10
        self.MAX_PAGE_SIZE = 100
        # Paths required for validation
        self.UPLOAD_DIR_PATH = None
        self.AVATAR_DIR_PATH = None
        self.ATTACHMENT_DIR_PATH = None


def test_validation_passes_with_safe_production_settings():
    settings = MockSettings()
    with patch.dict(os.environ, {"DEBUG": "false"}):
        # Should not raise any ValueError
        validate_security_settings(settings=settings)


def test_validation_rejects_default_secret_key():
    settings = MockSettings(SECRET_KEY="task_sync_enterprise_secret_key_chuandry_2026")
    with patch.dict(os.environ, {"DEBUG": "false"}):
        with pytest.raises(ValueError, match="default development fallback value"):
            validate_security_settings(settings=settings)


def test_validation_rejects_short_secret_key():
    settings = MockSettings(SECRET_KEY="too_short_key")
    with patch.dict(os.environ, {"DEBUG": "false"}):
        with pytest.raises(ValueError, match="at least 32 characters long"):
            validate_security_settings(settings=settings)


def test_validation_rejects_secret_key_placeholders():
    settings = MockSettings(SECRET_KEY="this_key_has_a_default_placeholder_inside")
    with patch.dict(os.environ, {"DEBUG": "false"}):
        with pytest.raises(ValueError, match="insecure placeholder 'default'"):
            validate_security_settings(settings=settings)


def test_validation_rejects_debug_in_production():
    settings = MockSettings()
    with patch.dict(os.environ, {"DEBUG": "true"}):
        with pytest.raises(ValueError, match="DEBUG mode must not be enabled"):
            validate_security_settings(settings=settings)


def test_validation_rejects_wildcard_cors():
    settings = MockSettings(BACKEND_CORS_ORIGINS=["*"])
    with patch.dict(os.environ, {"DEBUG": "false"}):
        with pytest.raises(ValueError, match="BACKEND_CORS_ORIGINS contains wildcard"):
            validate_security_settings(settings=settings)


def test_validation_rejects_wildcard_allowed_hosts():
    settings = MockSettings(ALLOWED_HOSTS=["*"])
    with patch.dict(os.environ, {"DEBUG": "false"}):
        with pytest.raises(ValueError, match="ALLOWED_HOSTS contains wildcard"):
            validate_security_settings(settings=settings)


def test_validation_rejects_localhost_database():
    settings = MockSettings(SQLALCHEMY_DATABASE_URI="mssql+pymssql://sa:password@localhost:1433/TaskSyncEnterprise")
    with patch.dict(os.environ, {"DEBUG": "false"}):
        with pytest.raises(ValueError, match="Database host is configured as 'localhost'"):
            validate_security_settings(settings=settings)


def test_validation_rejects_localhost_redis():
    settings = MockSettings(REDIS_URL="redis://127.0.0.1:6379/0")
    with patch.dict(os.environ, {"DEBUG": "false"}):
        with pytest.raises(ValueError, match="Redis host is configured as '127.0.0.1'"):
            validate_security_settings(settings=settings)


def test_log_masking_bearer_tokens():
    raw_log = "Sending request with auth Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c to next tier."
    masked = mask_sensitive(raw_log)
    assert "[REDACTED]" in masked
    assert "eyJhbGci" not in masked


def test_log_masking_passwords_in_db_url():
    raw_log = "Connecting using URI: mssql+pymssql://sa:SecretPass123!@sqlserver:1433/TaskSyncEnterprise"
    masked = mask_sensitive(raw_log)
    assert "SecretPass123!" not in masked
    assert "sa:[REDACTED]@sqlserver" in masked


def test_log_masking_passwords_in_redis_url():
    raw_log = "Connecting using URI: redis://:SuperCachePass99@redis:6379/0"
    masked = mask_sensitive(raw_log)
    assert "SuperCachePass99" not in masked
    assert "redis://:***@redis:6379/0" in masked


def test_log_masking_headers():
    auth_header_log = "Received Header Authorization: Bearer secret_bearer_token"
    masked_auth = mask_sensitive(auth_header_log)
    assert "secret_bearer_token" not in masked_auth
    assert "Authorization: [REDACTED]" in masked_auth

    cookie_log = "Cookie: session=xyz123abc; user=john"
    masked_cookie = mask_sensitive(cookie_log)
    assert "xyz123abc" not in masked_cookie
    assert "Cookie: [REDACTED]" in masked_cookie


def test_log_masking_key_value_secrets():
    # Case insensitivity checks
    log1 = 'Logging user input: password="MySecretPassword"'
    log2 = "Settings dict: {'smtp_password': 'SmtpPasswordString'}"
    log3 = '{"SECRET_KEY": "InsecureSecretKeyValue"}'

    assert "MySecretPassword" not in mask_sensitive(log1)
    assert "SmtpPasswordString" not in mask_sensitive(log2)
    assert "InsecureSecretKeyValue" not in mask_sensitive(log3)

    assert 'password="[REDACTED]"' in mask_sensitive(log1)
    assert "'smtp_password': '[REDACTED]'" in mask_sensitive(log2)
    assert '"SECRET_KEY": "[REDACTED]"' in mask_sensitive(log3)
