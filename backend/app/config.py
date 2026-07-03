from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Cấu hình nạp biến từ file môi trường .env chuẩn Pydantic V2
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 🛠️ 1. CẤU HÌNH HỆ THỐNG CƠ BẢN
    APP_NAME: str = "TaskSyncEnterprise"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Cấu hình CORS Origins (kết nối Frontend React sau này)
    BACKEND_CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

    # 💾 2. CẤU HÌNH KẾT NỐI DATABASE (SQL SERVER)
    MSSQL_HOST: str = "JINDOU_ITSUKI"   # Hoặc "JINDOU_ITSUKI\\SQLEXPRESS"
    MSSQL_DATABASE: str = "TaskSyncEnterprise"
    SQL_ECHO: bool = False

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        # Ép sử dụng IP loopback và port 1433 để tránh lỗi định danh tên máy trên SQL Server
        return "mssql+pymssql://127.0.0.1:1433/TaskSyncEnterprise?charset=utf8"

    # 📦 3. BATCH 5 - ENTERPRISE CORE CONSTANTS (Cấu hình phân trang toàn cục)
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # 🔐 4. BATCH 6 - AUTHENTICATION CONFIGS (Cấu hình bảo mật JWT)
    SECRET_KEY: str = "task_sync_enterprise_secret_key_chuandry_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # THÊM 2 DÒNG NÀY ĐỂ QUẢN LÝ CLIENT DỰNG SẴN
    MSSQL_CLIENT_ID: str = "tasksync_spa_react_prod_2026"
    MSSQL_CLIENT_SECRET: str = "default_fallback_secret_if_env_missing"


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Khởi tạo instance duy nhất để các module khác import sử dụng thống nhất
settings = get_settings()