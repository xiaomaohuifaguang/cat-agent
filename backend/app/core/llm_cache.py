import json

from sqlalchemy.orm import Session

from app.core.crypto import decrypt_value
from app.core.redis import redis_client
from app.models.llm import LlmSetting

KEY_PREFIX = "llm:setting:"


def _build_cache_value(setting: LlmSetting) -> dict:
    provider = setting.provider
    return {
        "base_url": provider.base_url,
        "model_name": provider.model_name,
        "api_key": decrypt_value(provider.api_key),
    }


def refresh_all_settings_cache(db: Session):
    settings = db.query(LlmSetting).all()
    pipe = redis_client.pipeline()
    existing_keys = redis_client.keys(f"{KEY_PREFIX}*")
    if existing_keys:
        pipe.delete(*existing_keys)
    for s in settings:
        pipe.set(f"{KEY_PREFIX}{s.category}", json.dumps(_build_cache_value(s), ensure_ascii=False))
    pipe.execute()


def update_setting_cache(setting: LlmSetting):
    redis_client.set(
        f"{KEY_PREFIX}{setting.category}",
        json.dumps(_build_cache_value(setting), ensure_ascii=False),
    )


def delete_setting_cache(category: str):
    redis_client.delete(f"{KEY_PREFIX}{category}")
