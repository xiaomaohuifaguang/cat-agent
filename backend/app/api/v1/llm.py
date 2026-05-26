from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.crypto import decrypt_value, encrypt_value
from app.core.database import get_db
from app.core.response import error, success
from app.models.llm import LlmProvider, LlmSetting
from app.schemas.llm import (
    ProviderCreate,
    ProviderResponse,
    ProviderUpdate,
    SettingCreate,
    SettingResponse,
    SettingUpdate,
)

router = APIRouter(tags=["LLM 管理"], dependencies=[Depends(get_current_user)])


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


# ==================== Provider CRUD ====================

@router.get("/providers")
def list_providers(db: Session = Depends(get_db)):
    providers = db.query(LlmProvider).order_by(LlmProvider.id.desc()).all()
    return success(data=[_provider_to_response(p) for p in providers])


@router.post("/providers")
def create_provider(req: ProviderCreate, db: Session = Depends(get_db)):
    provider = LlmProvider(
        name=req.name,
        base_url=req.base_url,
        model_name=req.model_name,
        api_key=encrypt_value(req.api_key),
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return success(data=_provider_to_response(provider), message="添加成功")


@router.put("/providers/{provider_id}")
def update_provider(provider_id: int, req: ProviderUpdate, db: Session = Depends(get_db)):
    provider = db.query(LlmProvider).filter(LlmProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail=error(404, "模型不存在"))
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
    return success(data=_provider_to_response(provider), message="更新成功")


@router.delete("/providers/{provider_id}")
def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    provider = db.query(LlmProvider).filter(LlmProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail=error(404, "模型不存在"))
    setting_count = db.query(LlmSetting).filter(LlmSetting.provider_id == provider_id).count()
    if setting_count > 0:
        raise HTTPException(status_code=400, detail=error(400, "该模型正在被用途配置引用，请先解除关联"))
    db.delete(provider)
    db.commit()
    return success(message="删除成功")


# ==================== Settings 管理 ====================

@router.get("/settings")
def list_settings(db: Session = Depends(get_db)):
    settings = db.query(LlmSetting).order_by(LlmSetting.id).all()
    return success(data=[
        SettingResponse(
            id=s.id,
            category=s.category,
            provider_id=s.provider_id,
            provider=_provider_to_response(s.provider),
            created_at=s.created_at,
            updated_at=s.updated_at,
        ) for s in settings
    ])


@router.post("/settings")
def create_setting(req: SettingCreate, db: Session = Depends(get_db)):
    provider = db.query(LlmProvider).filter(LlmProvider.id == req.provider_id).first()
    if not provider:
        raise HTTPException(status_code=400, detail=error(400, "指定的模型不存在"))
    existing = db.query(LlmSetting).filter(LlmSetting.category == req.category).first()
    if existing:
        raise HTTPException(status_code=400, detail=error(400, f"用途 '{req.category}' 已配置，请使用更新接口"))
    setting = LlmSetting(category=req.category, provider_id=req.provider_id)
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return success(data=SettingResponse(
        id=setting.id,
        category=setting.category,
        provider_id=setting.provider_id,
        provider=_provider_to_response(setting.provider),
        created_at=setting.created_at,
        updated_at=setting.updated_at,
    ), message="配置成功")


@router.put("/settings/{category}")
def update_setting(category: str, req: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(LlmSetting).filter(LlmSetting.category == category).first()
    if not setting:
        raise HTTPException(status_code=404, detail=error(404, f"用途 '{category}' 未配置"))
    provider = db.query(LlmProvider).filter(LlmProvider.id == req.provider_id).first()
    if not provider:
        raise HTTPException(status_code=400, detail=error(400, "指定的模型不存在"))
    setting.provider_id = req.provider_id
    db.commit()
    db.refresh(setting)
    return success(data=SettingResponse(
        id=setting.id,
        category=setting.category,
        provider_id=setting.provider_id,
        provider=_provider_to_response(setting.provider),
        created_at=setting.created_at,
        updated_at=setting.updated_at,
    ), message="更新成功")


@router.delete("/settings/{category}")
def delete_setting(category: str, db: Session = Depends(get_db)):
    setting = db.query(LlmSetting).filter(LlmSetting.category == category).first()
    if not setting:
        raise HTTPException(status_code=404, detail=error(404, f"用途 '{category}' 未配置"))
    db.delete(setting)
    db.commit()
    return success(message="删除成功")
