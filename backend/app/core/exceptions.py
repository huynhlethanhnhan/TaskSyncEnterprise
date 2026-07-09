# 📂 FILE: app/core/exceptions.py

class BusinessException(Exception):
    """
    Base exception for business logic and domain rule violations.
    Contains status code mapping for clean API output responses.
    """
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotFoundException(BusinessException):
    """Raised when a requested resource or database entity is missing."""
    def __init__(self, message: str = "Tài nguyên không tồn tại."):
        super().__init__(message, status_code=404)


class AuthorizationException(BusinessException):
    """Raised when privileges are insufficient or authentication fails."""
    def __init__(self, message: str = "Quyền truy cập bị từ chối."):
        super().__init__(message, status_code=403)


class ValidationException(BusinessException):
    """Raised when custom schemas or business payload parameters validation fails."""
    def __init__(self, message: str = "Dữ liệu không hợp lệ."):
        super().__init__(message, status_code=422)
