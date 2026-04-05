"""User-related API routes."""

from fastapi import APIRouter

from app.models.user import UserRole

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/roles", response_model=list[str])
async def list_roles() -> list[str]:
    """Return all supported user roles."""
    return [role.value for role in UserRole]
