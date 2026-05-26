from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---------- LlmProvider ----------

class ProviderCreate(BaseModel):
    name: str
    base_url: str
    model_name: str
    api_key: str


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None


class ProviderResponse(BaseModel):
    id: int
    name: str
    base_url: str
    model_name: str
    api_key_masked: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------- LlmSetting ----------

class SettingCreate(BaseModel):
    category: str
    provider_id: int


class SettingUpdate(BaseModel):
    provider_id: int


class SettingResponse(BaseModel):
    id: int
    category: str
    provider_id: int
    provider: ProviderResponse
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
