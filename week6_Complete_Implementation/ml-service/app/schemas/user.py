"""Pydantic models for user payloads and responses."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class UserRoleSchema(str, Enum):
    """Allowed user roles in API contracts."""

    patient = "patient"
    caregiver = "caregiver"
    doctor = "doctor"
    admin = "admin"


class UserBase(BaseModel):
    """Common user fields."""

    email: str = Field(..., min_length=3, max_length=255)
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRoleSchema = UserRoleSchema.patient


class UserCreate(UserBase):
    """Payload for creating a user."""

    password: str = Field(..., min_length=8, max_length=128)


class UserRead(UserBase):
    """Response model for user records."""

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
