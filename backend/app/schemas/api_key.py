from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ApiKeyPermissionItem(BaseModel):
    endpoint: str
    method: str = "POST"
    rate_limit: int = Field(default=-1, description="-1=不限")
    quota: int = Field(default=-1, description="-1=不限")


class ApiKeyPermissionResponse(BaseModel):
    id: int
    endpoint: str
    method: str
    rate_limit: int
    quota: int
    used_count: int

    class Config:
        from_attributes = True


class ApiKeyCreate(BaseModel):
    name: str = Field(..., max_length=100)
    expires_at: datetime | None = None
    permissions: list[ApiKeyPermissionItem] = []


class ApiKeyUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    status: int | None = None
    expires_at: datetime | None = None
    permissions: list[ApiKeyPermissionItem] | None = None


class ApiKeyResponse(BaseModel):
    id: int
    key: str
    name: str
    status: int
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
    permissions: list[ApiKeyPermissionResponse] = []

    class Config:
        from_attributes = True


class ApiKeyListItem(BaseModel):
    id: int
    key: str
    name: str
    status: int
    expires_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyUsageLogItem(BaseModel):
    id: int
    endpoint: str
    method: str
    status_code: int
    created_at: datetime

    class Config:
        from_attributes = True
