"""SQLAlchemy engine/session setup (SQLite or PostgreSQL)."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.base import Base

# Build engine kwargs conditionally for SQLite vs Postgres
_engine_kwargs: dict = {}

if settings.is_sqlite:
    # SQLite needs check_same_thread=False for FastAPI's threaded usage
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_pre_ping"] = True

engine = create_engine(
    settings.sqlalchemy_database_uri,
    **_engine_kwargs,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables for all registered SQLAlchemy models."""
    # Import model modules so metadata is registered before create_all.
    from app.models import user  # noqa: F401

    Base.metadata.create_all(bind=engine)

