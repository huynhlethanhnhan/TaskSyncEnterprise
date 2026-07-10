# 📂 FILE: app/core/exceptions.py
import logging
from typing import Any
from app.core import error_codes

class BaseAppException(Exception):
    """
    Base enterprise exception for all custom runtime and application errors.
    Supports a HTTP status code, specific error code, user message, optional details, and log level.
    """
    def __init__(
        self,
        message: str,
        error_code: str = error_codes.SYSTEM_INTERNAL_ERROR,
        status_code: int = 500,
        details: Any = None,
        log_level: int = logging.ERROR
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details
        self.log_level = log_level

# Maintain backward compatibility
AppException = BaseAppException

class BusinessRuleException(BaseAppException):
    """Base exception for database constraints, business rule validation and logic violations."""
    def __init__(
        self,
        message: str,
        error_code: str = "BUSINESS_ERROR",
        status_code: int = 400,
        details: Any = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status_code,
            details=details,
            log_level=logging.WARNING
        )

# Maintain backward compatibility
BusinessException = BusinessRuleException

class ValidationException(BaseAppException):
    """Raised when custom schemas or API input payload parameter validation fails."""
    def __init__(
        self,
        message: str = "Dữ liệu không hợp lệ.",
        error_code: str = error_codes.VALIDATION_REQUEST_FAILED,
        details: Any = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=422,
            details=details,
            log_level=logging.WARNING
        )

class AuthenticationException(BaseAppException):
    """Raised when user credentials validation, JWT extraction, or JWT decryption fails."""
    def __init__(
        self,
        message: str = "Không thể xác thực thông tin đăng nhập hoặc Token đã hết hạn!",
        error_code: str = error_codes.AUTH_UNAUTHORIZED,
        details: Any = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=401,
            details=details,
            log_level=logging.WARNING
        )

class AuthorizationException(BaseAppException):
    """Raised when active user role has insufficient privileges or permissions."""
    def __init__(
        self,
        message: str = "Quyền truy cập bị từ chối.",
        error_code: str = error_codes.AUTH_FORBIDDEN,
        details: Any = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=403,
            details=details,
            log_level=logging.WARNING
        )

class ResourceNotFoundException(BaseAppException):
    """Raised when a queried entity or database resource is not found."""
    def __init__(
        self,
        message: str = "Tài nguyên không tồn tại.",
        error_code: str = error_codes.SYSTEM_INTERNAL_ERROR,
        details: Any = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=404,
            details=details,
            log_level=logging.WARNING
        )

# Maintain backward compatibility
NotFoundException = ResourceNotFoundException

class ConflictException(BaseAppException):
    """Raised when a command conflicts with current database resource states (e.g. duplicate keys)."""
    def __init__(
        self,
        message: str = "Yêu cầu xung đột với trạng thái tài nguyên hiện tại.",
        error_code: str = error_codes.SYSTEM_INTERNAL_ERROR,
        details: Any = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=409,
            details=details,
            log_level=logging.WARNING
        )

class DatabaseException(BaseAppException):
    """Raised for database integrity issues, timeout conditions, or general ORM errors."""
    def __init__(
        self,
        message: str = "Đã xảy ra lỗi tương tác cơ sở dữ liệu hệ thống.",
        error_code: str = error_codes.DATABASE_INTEGRITY_VIOLATION,
        details: Any = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=500,
            details=details,
            log_level=logging.ERROR
        )

class StorageException(BaseAppException):
    """Raised when saving or loading static files to/from storage disk partitions fails."""
    def __init__(
        self,
        message: str = "Lỗi lưu trữ dữ liệu.",
        error_code: str = error_codes.FILE_STORAGE_ERROR,
        details: Any = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=500,
            details=details,
            log_level=logging.ERROR
        )

class ExternalServiceException(BaseAppException):
    """Raised when connection timeouts or server errors occur during external API communication."""
    def __init__(
        self,
        message: str = "Lỗi kết nối dịch vụ bên ngoài.",
        error_code: str = error_codes.SYSTEM_SERVICE_UNAVAILABLE,
        details: Any = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=500,
            details=details,
            log_level=logging.ERROR
        )

class UnexpectedApplicationException(BaseAppException):
    """Raised when an unhandled, unexpected exception escapes at runtime."""
    def __init__(
        self,
        message: str = "Hệ thống gặp sự cố nội bộ.",
        error_code: str = error_codes.SYSTEM_INTERNAL_ERROR,
        details: Any = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=500,
            details=details,
            log_level=logging.CRITICAL
        )
