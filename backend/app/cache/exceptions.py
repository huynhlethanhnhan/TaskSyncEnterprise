# 📂 FILE: app/cache/exceptions.py
"""
Custom cache exception classes.
"""

class CacheError(Exception):
    """Base exception for all cache-related operations."""
    pass


class CacheConnectionError(CacheError):
    """Raised or logged when connection to the Redis server fails."""
    pass


class CacheSerializationError(CacheError):
    """Raised when JSON or Pydantic serialization/deserialization fails."""
    pass
