"""Security helpers for protected ML endpoints."""

from fastapi import Header, HTTPException, status

from app.core.config import settings


def require_screening_api_key(
    x_api_key: str | None = Header(default=None, alias="x-api-key"),
) -> None:
    """Validate static API key for screening prediction routes."""
    expected_key = settings.secret_key.get_secret_value()
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Screening API key is not configured.",
        )

    if x_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
