import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.api_key_auth import require_user
from app.core.response import error, success
from app.models import ApiKey, ApiKeyPermission, ApiKeyUsageLog
from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyListItem,
    ApiKeyResponse,
    ApiKeyUpdate,
    ApiKeyUsageLogItem,
)

router = APIRouter(tags=["API Key 管理"], dependencies=[Depends(require_user)])

# 当前支持 API Key 调用的接口白名单
AVAILABLE_ENDPOINTS = [
    {"endpoint": "/api/v1/documents/parse", "method": "POST", "label": "文件解析"},
]


def _generate_api_key() -> str:
    """生成随机 API Key，格式: api-key-cat- + 24 位字母数字"""
    return "api-key-cat-" + "".join(
        secrets.choice(string.ascii_letters + string.digits) for _ in range(24)
    )


@router.get("/endpoints")
def list_available_endpoints():
    """返回当前支持 API Key 调用的接口列表"""
    return success(data=AVAILABLE_ENDPOINTS)


@router.get("")
def list_api_keys(db: Session = Depends(get_db)):
    keys = db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()
    return success(data=[ApiKeyListItem.model_validate(k).model_dump(mode="json") for k in keys])


@router.post("")
def create_api_key(data: ApiKeyCreate, db: Session = Depends(get_db)):
    key_value = _generate_api_key()
    key = ApiKey(
        key=key_value,
        name=data.name,
        expires_at=data.expires_at,
    )
    db.add(key)
    db.flush()

    for perm in data.permissions:
        db.add(
            ApiKeyPermission(
                api_key_id=key.id,
                endpoint=perm.endpoint,
                method=perm.method,
                rate_limit=perm.rate_limit,
                quota=perm.quota,
            )
        )

    db.commit()
    db.refresh(key)
    return success(data=ApiKeyResponse.model_validate(key).model_dump(mode="json"), message="创建成功")


@router.get("/{key_id}")
def get_api_key(key_id: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail=error(404, "API Key 不存在"))
    return success(data=ApiKeyResponse.model_validate(key).model_dump(mode="json"))


@router.put("/{key_id}")
def update_api_key(key_id: int, data: ApiKeyUpdate, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail=error(404, "API Key 不存在"))

    if data.name is not None:
        key.name = data.name
    if data.status is not None:
        key.status = data.status
    if data.expires_at is not None:
        key.expires_at = data.expires_at

    if data.permissions is not None:
        db.query(ApiKeyPermission).filter(ApiKeyPermission.api_key_id == key.id).delete()
        for perm in data.permissions:
            db.add(
                ApiKeyPermission(
                    api_key_id=key.id,
                    endpoint=perm.endpoint,
                    method=perm.method,
                    rate_limit=perm.rate_limit,
                    quota=perm.quota,
                )
            )

    db.commit()
    db.refresh(key)
    return success(data=ApiKeyResponse.model_validate(key).model_dump(mode="json"), message="更新成功")


@router.delete("/{key_id}")
def delete_api_key(key_id: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail=error(404, "API Key 不存在"))
    db.delete(key)
    db.commit()
    return success(message="删除成功")


@router.get("/{key_id}/logs")
def list_api_key_logs(key_id: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail=error(404, "API Key 不存在"))
    logs = (
        db.query(ApiKeyUsageLog)
        .filter(ApiKeyUsageLog.api_key_id == key_id)
        .order_by(ApiKeyUsageLog.created_at.desc())
        .limit(200)
        .all()
    )
    return success(data=[ApiKeyUsageLogItem.model_validate(l).model_dump(mode="json") for l in logs])


@router.post("/{key_id}/regenerate")
def regenerate_api_key(key_id: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail=error(404, "API Key 不存在"))
    key.key = _generate_api_key()
    db.commit()
    db.refresh(key)
    return success(data={"key": key.key}, message="重置成功")
