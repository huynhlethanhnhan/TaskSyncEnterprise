# 📂 FILE: app/config.py
from functools import lru_cache
from pathlib import Path
from typing import Literal
from pydantic import Field, SecretStr, PositiveInt
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Centralized Application Configuration Management for TaskSyncEnterprise.
    Uses Pydantic Settings V2 to load configuration variables from environment or a .env file.
    This configuration is frozen (read-only) at runtime to prevent accidental modifications.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        frozen=True,  # Immutability pass: prevents settings modification after startup
    )

    # =========================================================================
    # 🧱 1. APPLICATION SETTINGS
    # =========================================================================
    
    APP_NAME: str = Field(
        default="TaskSyncEnterprise",
        description=(
            "Purpose: Name of the application. Used in UI headers, metadata, and communications.\n"
            "Default: 'TaskSyncEnterprise'\n"
            "Production Recommendation: Leave as default or customize to match corporate branding.\n"
            "Development Recommendation: Leave as default.\n"
            "Security Consideration: None."
        )
    )
    
    ENVIRONMENT: Literal["development", "production", "testing"] = Field(
        default="development",
        description=(
            "Purpose: Defines the deployment environment.\n"
            "Default: 'development'\n"
            "Production Recommendation: Set to 'production' to enforce strict security validations (e.g. strong SECRET_KEY).\n"
            "Development Recommendation: Set to 'development' or 'testing'.\n"
            "Security Consideration: Influences security logic like default keys checks and debug page exposures."
        )
    )
    
    API_V1_STR: str = Field(
        default="/api/v1",
        description=(
            "Purpose: Base URL prefix for all Version 1 API routes.\n"
            "Default: '/api/v1'\n"
            "Production Recommendation: Keep default or update if API routing changes.\n"
            "Development Recommendation: Keep default.\n"
            "Security Consideration: Keep consistent to avoid endpoint bypass issues."
        )
    )

    # =========================================================================
    # 🔒 2. SECURITY & JWT SETTINGS
    # =========================================================================
    
    SECRET_KEY: SecretStr = Field(
        default="task_sync_enterprise_secret_key_chuandry_2026",
        description=(
            "Purpose: Secret key for signing and verifying JWT tokens.\n"
            "Default: 'task_sync_enterprise_secret_key_chuandry_2026'\n"
            "Production Recommendation: Replace with a cryptographically strong, unique secret key (e.g., generated via openssl rand -hex 32).\n"
            "Development Recommendation: Can use default or a mock development key.\n"
            "Security Consideration: CRITICAL. A weak or compromised key allows attackers to forge tokens and gain full admin access."
        )
    )
    
    ALGORITHM: str = Field(
        default="HS256",
        description=(
            "Purpose: Hashing algorithm used to encrypt and verify JWT signatures.\n"
            "Default: 'HS256'\n"
            "Production Recommendation: 'HS256' is standard. Can change to asymmetric algorithms like RS256 if integrated with OIDC.\n"
            "Development Recommendation: Keep 'HS256'.\n"
            "Security Consideration: Use modern cryptographically sound algorithms."
        )
    )
    
    ACCESS_TOKEN_EXPIRE_MINUTES: PositiveInt = Field(
        default=60,
        description=(
            "Purpose: Lifetime duration of JWT access tokens in minutes.\n"
            "Default: 60\n"
            "Production Recommendation: 15 to 30 minutes to minimize access duration in case of token leakage.\n"
            "Development Recommendation: 60 minutes or longer to avoid frequent re-authentications during debugging.\n"
            "Security Consideration: Shorter token lifetimes improve system security against intercepted token attacks."
        )
    )
    
    REFRESH_TOKEN_EXPIRE_DAYS: PositiveInt = Field(
        default=7,
        description=(
            "Purpose: Lifetime duration of JWT refresh tokens in days.\n"
            "Default: 7\n"
            "Production Recommendation: 7 to 30 days depending on corporate compliance. Ensure token blacklist rotation is in place.\n"
            "Development Recommendation: 7 days is fine.\n"
            "Security Consideration: Refresh tokens must be kept highly secure and revoked immediately upon user logout."
        )
    )
    
    MSSQL_CLIENT_ID: str = Field(
        default="tasksync_spa_react_prod_2026",
        description=(
            "Purpose: Expected Client ID passed by frontend app client credentials flow.\n"
            "Default: 'tasksync_spa_react_prod_2026'\n"
            "Production Recommendation: Reconfigure to a unique string defined by environment secrets.\n"
            "Development Recommendation: Leave as default.\n"
            "Security Consideration: Used to prevent unauthorized third-party clients from invoking client auth endpoints."
        )
    )
    
    MSSQL_CLIENT_SECRET: SecretStr = Field(
        default="default_fallback_secret_if_env_missing",
        description=(
            "Purpose: Expected Client Secret passed by frontend app client credentials flow.\n"
            "Default: 'default_fallback_secret_if_env_missing'\n"
            "Production Recommendation: Enforce a cryptographically secure value defined in environment variables.\n"
            "Development Recommendation: Leave as default.\n"
            "Security Consideration: Guard this secret carefully. Do not commit actual secrets to source control."
        )
    )

    # =========================================================================
    # 💾 3. DATABASE SETTINGS (MS SQL SERVER)
    # =========================================================================
    
    MSSQL_HOST: str = Field(
        default="JINDOU_ITSUKI",
        description=(
            "Purpose: SQL Server hostname or network address.\n"
            "Default: 'JINDOU_ITSUKI'\n"
            "Production Recommendation: Point to the production DB server or cluster instance.\n"
            "Development Recommendation: Local SQL Server hostname, IP address, or '127.0.0.1'.\n"
            "Security Consideration: None directly, but should be isolated in private subnets in production."
        )
    )
    
    MSSQL_PORT: PositiveInt = Field(
        default=1433,
        description=(
            "Purpose: Networking port used by Microsoft SQL Server database.\n"
            "Default: 1433\n"
            "Production Recommendation: 1433 or custom secure port.\n"
            "Development Recommendation: 1433.\n"
            "Security Consideration: Restrict port access through firewalls to authorized app servers only."
        )
    )
    
    MSSQL_DATABASE: str = Field(
        default="TaskSyncEnterprise",
        description=(
            "Purpose: Database name within SQL Server.\n"
            "Default: 'TaskSyncEnterprise'\n"
            "Production Recommendation: Production-specific database name.\n"
            "Development Recommendation: 'TaskSyncEnterprise' or development DB variant.\n"
            "Security Consideration: None."
        )
    )
    
    MSSQL_USER: str | None = Field(
        default=None,
        description=(
            "Purpose: Database username for SQL Server Authentication.\n"
            "Default: None (falls back to local Windows authentication/default pymssql behavior if empty).\n"
            "Production Recommendation: Specify a dedicated, least-privileged application user account.\n"
            "Development Recommendation: Keep empty for Windows Auth, or set local DB username.\n"
            "Security Consideration: Do not use 'sa' superuser account in production."
        )
    )
    
    MSSQL_PASSWORD: SecretStr | None = Field(
        default=None,
        description=(
            "Purpose: Database password corresponding to MSSQL_USER.\n"
            "Default: None (falls back to local Windows authentication/default pymssql behavior if empty).\n"
            "Production Recommendation: Set to a strong password via env variables.\n"
            "Development Recommendation: Keep empty or set local DB password.\n"
            "Security Consideration: Keep confidential, and supply strictly via runtime environments."
        )
    )
    
    SQL_ECHO: bool = Field(
        default=False,
        description=(
            "Purpose: Toggles SQLAlchemy engine query logging.\n"
            "Default: False\n"
            "Production Recommendation: Set to False to avoid logging sensitive user details and straining disk I/O.\n"
            "Development Recommendation: Set to True when debugging query performance.\n"
            "Security Consideration: SQL log logs might leak personal/sensitive values query parameters in plaintext."
        )
    )
    
    DATABASE_URL: str | None = Field(
        default=None,
        description=(
            "Purpose: Overrides the built database URI if direct connection string injection is desired (e.g. Docker, CI).\n"
            "Default: None\n"
            "Production Recommendation: Use this parameter to inject full, validated production connection string.\n"
            "Development Recommendation: Leave empty to allow automatic host/credentials construction.\n"
            "Security Consideration: Password will be embedded in this URL. Must be supplied securely at runtime."
        )
    )

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """
        Dynamically constructs the SQLAlchemy DB Connection URI or returns the override.
        Preserves backward compatibility with default local development environments.
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        
        # Build pymssql connection string: mssql+pymssql://[user:[password]@]host[:port]/database[?key=value]
        if self.MSSQL_USER and self.MSSQL_PASSWORD:
            import urllib.parse
            user = urllib.parse.quote_plus(self.MSSQL_USER)
            password = urllib.parse.quote_plus(self.MSSQL_PASSWORD.get_secret_value())
            return f"mssql+pymssql://{user}:{password}@{self.MSSQL_HOST}:{self.MSSQL_PORT}/{self.MSSQL_DATABASE}?charset=utf8"
        
        # Exact backward compatibility default loopback check
        if self.MSSQL_HOST == "JINDOU_ITSUKI" or self.MSSQL_HOST == "127.0.0.1":
            return f"mssql+pymssql://127.0.0.1:{self.MSSQL_PORT}/{self.MSSQL_DATABASE}?charset=utf8"
            
        return f"mssql+pymssql://{self.MSSQL_HOST}:{self.MSSQL_PORT}/{self.MSSQL_DATABASE}?charset=utf8"

    # =========================================================================
    # 📦 4. PAGINATION SETTINGS
    # =========================================================================
    
    DEFAULT_PAGE_SIZE: PositiveInt = Field(
        default=20,
        description=(
            "Purpose: Default limit of items returned in paginated lists.\n"
            "Default: 20\n"
            "Production Recommendation: 20 or 50 based on client performance requirements.\n"
            "Development Recommendation: Keep at 20.\n"
            "Security Consideration: Helps prevent excessive memory consumption on query responses."
        )
    )
    
    MAX_PAGE_SIZE: PositiveInt = Field(
        default=100,
        description=(
            "Purpose: Maximum limit bounds for paginated lists to safeguard resources.\n"
            "Default: 100\n"
            "Production Recommendation: Enforce a strict ceiling (e.g. 100 or 250) to prevent abuse.\n"
            "Development Recommendation: 100.\n"
            "Security Consideration: Mitigates Denial of Service (DoS) risks where clients request millions of rows."
        )
    )

    # =========================================================================
    # 📡 5. CORS SETTINGS
    # =========================================================================
    
    BACKEND_CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173"],
        description=(
            "Purpose: Allowed CORS origins permitted to invoke backend API endpoints.\n"
            "Default: ['http://localhost:5173']\n"
            "Production Recommendation: Declare specific origin URLs matching target web application domains. DO NOT use '*' in production.\n"
            "Development Recommendation: Allow localhost development port origins (5173/3000).\n"
            "Security Consideration: Restricting origins prevents unauthorized browser-based requests to the API."
        )
    )

    # =========================================================================
    # 📁 6. STORAGE & FILE UPLOAD SETTINGS
    # =========================================================================
    
    STORAGE_UPLOAD_DIR: str = Field(
        default="uploads",
        description=(
            "Purpose: Directory path where user files are physically stored.\n"
            "Default: 'uploads'\n"
            "Production Recommendation: Absolute path to standard persistent storage volume or mount.\n"
            "Development Recommendation: Relative path 'uploads'.\n"
            "Security Consideration: Files should be stored outside the source code tree, and executed execution permissions should be blocked."
        )
    )
    
    STORAGE_AVATAR_SUBDIR: str = Field(
        default="avatars",
        description=(
            "Purpose: Subfolder for user avatars.\n"
            "Default: 'avatars'\n"
            "Production Recommendation: Keep as subfolder.\n"
            "Development Recommendation: 'avatars'.\n"
            "Security Consideration: Ensure files in avatars cannot trigger arbitrary system execution."
        )
    )
    
    STORAGE_ATTACHMENT_SUBDIR: str = Field(
        default="attachments",
        description=(
            "Purpose: Subfolder for task/project attachments.\n"
            "Default: 'attachments'\n"
            "Production Recommendation: Keep as subfolder.\n"
            "Development Recommendation: 'attachments'.\n"
            "Security Consideration: Attachments contain arbitrary documents; strict sandboxing should be applied."
        )
    )
    
    STORAGE_MAX_AVATAR_SIZE: PositiveInt = Field(
        default=5 * 1024 * 1024,
        description=(
            "Purpose: Maximum allowed size for uploaded avatar files (in bytes).\n"
            "Default: 5,242,880 (5 Megabytes)\n"
            "Production Recommendation: 2MB to 5MB depending on format optimization rules.\n"
            "Development Recommendation: 5MB.\n"
            "Security Consideration: Limits disk storage depletion attacks through huge file uploads."
        )
    )
    
    STORAGE_MAX_ATTACHMENT_SIZE: PositiveInt = Field(
        default=20 * 1024 * 1024,
        description=(
            "Purpose: Maximum allowed size for uploaded attachment files (in bytes).\n"
            "Default: 20,971,520 (20 Megabytes)\n"
            "Production Recommendation: 20MB or higher based on business requirements.\n"
            "Development Recommendation: 20MB.\n"
            "Security Consideration: Limits resource exhaustion vulnerabilities."
        )
    )
    
    STORAGE_ALLOWED_AVATAR_EXTENSIONS: list[str] = Field(
        default_factory=lambda: [".jpg", ".jpeg", ".png", ".webp"],
        description=(
            "Purpose: Allowed file formats/extensions for avatar uploads.\n"
            "Default: ['.jpg', '.jpeg', '.png', '.webp']\n"
            "Production Recommendation: Limit strictly to web-optimized image formats.\n"
            "Development Recommendation: Keep default.\n"
            "Security Consideration: Restricting image formats prevents upload of scripts disguised as images."
        )
    )
    
    STORAGE_ALLOWED_ATTACHMENT_EXTENSIONS: list[str] = Field(
        default_factory=lambda: [
            ".txt", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
            ".ppt", ".pptx", ".zip", ".rar", ".jpg", ".jpeg", ".png", ".webp"
        ],
        description=(
            "Purpose: Allowed file formats/extensions for task attachments.\n"
            "Default: Common documents, spreadsheets, zip archives, and images.\n"
            "Production Recommendation: Exclude dangerous executable types (.exe, .msi, .bat, .sh).\n"
            "Development Recommendation: Keep standard documentation types.\n"
            "Security Consideration: Blocking executables prevents users from uploading files that could compromise other machines."
        )
    )

    @property
    def UPLOAD_DIR_PATH(self) -> Path:
        """Resolves the absolute Path to the main uploads folder."""
        path = Path(self.STORAGE_UPLOAD_DIR)
        if not path.is_absolute():
            # Resolve relative to the root backend project directory (parent of app)
            path = Path(__file__).resolve().parent.parent / path
        return path

    @property
    def AVATAR_DIR_PATH(self) -> Path:
        """Resolves the absolute Path to the avatars subfolder."""
        return self.UPLOAD_DIR_PATH / self.STORAGE_AVATAR_SUBDIR

    @property
    def ATTACHMENT_DIR_PATH(self) -> Path:
        """Resolves the absolute Path to the attachments subfolder."""
        return self.UPLOAD_DIR_PATH / self.STORAGE_ATTACHMENT_SUBDIR


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Singleton configuration instance for system-wide imports.
# Loaded once, cached, and frozen to prevent mutation.
settings = get_settings()