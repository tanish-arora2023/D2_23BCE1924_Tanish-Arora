"""Application settings loaded from environment variables."""

from urllib.parse import quote_plus

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the ML service."""

    # Server
    ml_service_port: int = 8001
    debug: bool = False

    # ML model
    model_path: str = "./trained_models/dementia_model.pkl"
    vosk_model_path: str = "./trained_models/vosk_model"

    # CORS
    allowed_origins: str = "http://localhost:5000,http://localhost:5173"

    # App secret
    secret_key: SecretStr = SecretStr("change-me")

    # Database — accepts SQLite or PostgreSQL URI
    database_url: SecretStr | None = None
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "neurosense"
    postgres_user: str = "postgres"
    postgres_password: SecretStr = SecretStr("change-me")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value):
        """Parse DEBUG values explicitly so false-like strings disable debug."""
        if isinstance(value, bool):
            return value

        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                return True
            if normalized in {"0", "false", "no", "off"}:
                return False
            raise ValueError("DEBUG must be one of true/false, 1/0, yes/no, on/off.")

        if isinstance(value, (int, float)):
            return bool(value)

        raise ValueError("DEBUG must be a boolean-compatible value.")

    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated origins into a list."""
        origins = [
            origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()
        ]
        if not origins:
            raise ValueError("ALLOWED_ORIGINS must define at least one origin.")
        return origins

    @property
    def is_sqlite(self) -> bool:
        """Return True when the resolved database URI uses SQLite."""
        if self.database_url:
            return self.database_url.get_secret_value().strip().startswith("sqlite")
        return False

    @property
    def sqlalchemy_database_uri(self) -> str:
        """Build SQLAlchemy connection string.

        If DATABASE_URL is set and begins with ``sqlite``, return it
        directly — never fall through to construct a PostgreSQL URI.
        """
        if self.database_url:
            database_url = self.database_url.get_secret_value().strip()
            if database_url:
                return database_url

        # Fallback: build PostgreSQL URI from individual env vars
        username = quote_plus(self.postgres_user)
        password = quote_plus(self.postgres_password.get_secret_value())
        return (
            f"postgresql+psycopg2://{username}:{password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()

