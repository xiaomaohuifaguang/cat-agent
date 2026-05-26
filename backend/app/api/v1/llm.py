from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import error, success
from app.schemas.llm import ProviderCreate, ProviderUpdate, SettingCreate, SettingUpdate
from app.services.llm import LlmService

router = APIRouter(tags=["LLM 管理"], dependencies=[Depends(get_current_user)])


# ==================== Provider CRUD ====================

@router.get("/providers")
def list_providers(db: Session = Depends(get_db)):
    data = LlmService.list_providers(db)
    return success(data=data)


@router.post("/providers")
def create_provider(req: ProviderCreate, db: Session = Depends(get_db)):
    data = LlmService.create_provider(db, req)
    return success(data=data, message="添加成功")


@router.put("/providers/{provider_id}")
def update_provider(provider_id: int, req: ProviderUpdate, db: Session = Depends(get_db)):
    data = LlmService.update_provider(db, provider_id, req)
    if not data:
        raise HTTPException(status_code=404, detail=error(404, "模型不存在"))
    return success(data=data, message="更新成功")


@router.delete("/providers/{provider_id}")
def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    ok, msg = LlmService.delete_provider(db, provider_id)
    if not ok:
        raise HTTPException(status_code=400, detail=error(400, msg))
    return success(message="删除成功")


# ==================== Settings 管理 ====================

@router.get("/settings")
def list_settings(db: Session = Depends(get_db)):
    data = LlmService.list_settings(db)
    return success(data=data)


@router.post("/settings")
def create_setting(req: SettingCreate, db: Session = Depends(get_db)):
    data = LlmService.create_setting(db, req)
    if not data:
        raise HTTPException(status_code=400, detail=error(400, "指定的模型不存在或该用途已配置"))
    return success(data=data, message="配置成功")


@router.put("/settings/{category}")
def update_setting(category: str, req: SettingUpdate, db: Session = Depends(get_db)):
    data = LlmService.update_setting(db, category, req)
    if not data:
        raise HTTPException(status_code=404, detail=error(404, f"用途 '{category}' 未配置或指定模型不存在"))
    return success(data=data, message="更新成功")


@router.delete("/settings/{category}")
def delete_setting(category: str, db: Session = Depends(get_db)):
    ok = LlmService.delete_setting(db, category)
    if not ok:
        raise HTTPException(status_code=404, detail=error(404, f"用途 '{category}' 未配置"))
    return success(message="删除成功")