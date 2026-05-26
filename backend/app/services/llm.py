from sqlalchemy.orm import Session

from app.core.crypto import decrypt_value, encrypt_value
from app.core.llm_cache import delete_setting_cache, update_setting_cache
from app.models.llm import LlmProvider, LlmSetting
from app.schemas.llm import (
    ProviderCreate,
    ProviderResponse,
    ProviderUpdate,
    SettingCreate,
    SettingResponse,
    SettingUpdate,
)


def _mask_api_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return key[:4] + "****" + key[-4:]


def _provider_to_response(p: LlmProvider) -> ProviderResponse:
    plain_key = decrypt_value(p.api_key)
    return ProviderResponse(
        id=p.id,
        name=p.name,
        base_url=p.base_url,
        model_name=p.model_name,
        api_key_masked=_mask_api_key(plain_key),
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


class LlmService:
    # ---------- Provider ----------

    @staticmethod
    def list_providers(db: Session) -> list[ProviderResponse]:
        providers = db.query(LlmProvider).order_by(LlmProvider.id.desc()).all()
        return [_provider_to_response(p) for p in providers]

    @staticmethod
    def create_provider(db: Session, req: ProviderCreate) -> ProviderResponse:
        provider = LlmProvider(
            name=req.name,
            base_url=req.base_url,
            model_name=req.model_name,
            api_key=encrypt_value(req.api_key),
        )
        db.add(provider)
        db.commit()
        db.refresh(provider)
        return _provider_to_response(provider)

    @staticmethod
    def update_provider(db: Session, provider_id: int, req: ProviderUpdate) -> ProviderResponse:
        provider = db.query(LlmProvider).filter(LlmProvider.id == provider_id).first()
        if not provider:
            return None
        if req.name is not None:
            provider.name = req.name
        if req.base_url is not None:
            provider.base_url = req.base_url
        if req.model_name is not None:
            provider.model_name = req.model_name
        if req.api_key is not None:
            provider.api_key = encrypt_value(req.api_key)
        db.commit()
        db.refresh(provider)
        for s in provider.settings:
            update_setting_cache(s)
        return _provider_to_response(provider)

    @staticmethod
    def delete_provider(db: Session, provider_id: int) -> tuple[bool, str]:
        provider = db.query(LlmProvider).filter(LlmProvider.id == provider_id).first()
        if not provider:
            return (False, "模型不存在")
        setting_count = db.query(LlmSetting).filter(LlmSetting.provider_id == provider_id).count()
        if setting_count > 0:
            return (False, "该模型正在被用途配置引用，请先解除关联")
        db.delete(provider)
        db.commit()
        return (True, "")

    # ---------- Setting ----------

    @staticmethod
    def list_settings(db: Session) -> list[SettingResponse]:
        settings = db.query(LlmSetting).order_by(LlmSetting.id).all()
        return [
            SettingResponse(
                id=s.id,
                category=s.category,
                provider_id=s.provider_id,
                provider=_provider_to_response(s.provider),
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            for s in settings
        ]

    @staticmethod
    def create_setting(db: Session, req: SettingCreate) -> SettingResponse | None:
        provider = db.query(LlmProvider).filter(LlmProvider.id == req.provider_id).first()
        if not provider:
            return None
        existing = db.query(LlmSetting).filter(LlmSetting.category == req.category).first()
        if existing:
            return None
        setting = LlmSetting(category=req.category, provider_id=req.provider_id)
        db.add(setting)
        db.commit()
        db.refresh(setting)
        update_setting_cache(setting)
        return SettingResponse(
            id=setting.id,
            category=setting.category,
            provider_id=setting.provider_id,
            provider=_provider_to_response(setting.provider),
            created_at=setting.created_at,
            updated_at=setting.updated_at,
        )

    @staticmethod
    def update_setting(db: Session, category: str, req: SettingUpdate) -> SettingResponse | None:
        setting = db.query(LlmSetting).filter(LlmSetting.category == category).first()
        if not setting:
            return None
        provider = db.query(LlmProvider).filter(LlmProvider.id == req.provider_id).first()
        if not provider:
            return None
        setting.provider_id = req.provider_id
        db.commit()
        db.refresh(setting)
        update_setting_cache(setting)
        return SettingResponse(
            id=setting.id,
            category=setting.category,
            provider_id=setting.provider_id,
            provider=_provider_to_response(setting.provider),
            created_at=setting.created_at,
            updated_at=setting.updated_at,
        )

    @staticmethod
    def delete_setting(db: Session, category: str) -> bool:
        setting = db.query(LlmSetting).filter(LlmSetting.category == category).first()
        if not setting:
            return False
        db.delete(setting)
        db.commit()
        delete_setting_cache(category)
        return True