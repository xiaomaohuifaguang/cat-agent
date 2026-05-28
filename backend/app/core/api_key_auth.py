from datetime import datetime

from fastapi import Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import redis_client
from app.core.response import error
from app.core.security import verify_token
from app.models import ApiKey, ApiKeyPermission


def _get_key_from_header(authorization: str | None) -> str | None:
    """从 Authorization 头提取 Bearer token"""
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None


def _get_api_key_from_header(x_api_key: str | None) -> str | None:
    """从 X-API-Key 头提取 API Key"""
    return x_api_key.strip() if x_api_key else None


def _check_rate_limit(api_key_id: int, perm: ApiKeyPermission) -> bool:
    """检查是否触发限流，返回 True=允许，False=拒绝"""
    if perm.rate_limit == -1:
        return True
    key = f"ratelimit:apikey:{api_key_id}:{perm.endpoint}:{perm.method}"
    current = redis_client.get(key)
    if current is None:
        redis_client.setex(key, 60, 1)
        return True
    if int(current) >= perm.rate_limit:
        return False
    redis_client.incr(key)
    return True


def validate_api_key(db: Session, api_key_value: str, endpoint: str, method: str) -> ApiKey:
    """验证 API Key 的合法性、过期时间、权限、配额和限流

    Raises:
        HTTPException: 401/403/429 等错误
    """
    key = db.query(ApiKey).filter(ApiKey.key == api_key_value, ApiKey.status == 1).first()
    if not key:
        raise HTTPException(status_code=401, detail=error(401, "API Key 无效"))

    if key.expires_at and key.expires_at < datetime.now():
        raise HTTPException(status_code=403, detail=error(403, "API Key 已过期"))

    perm = (
        db.query(ApiKeyPermission)
        .filter(
            ApiKeyPermission.api_key_id == key.id,
            ApiKeyPermission.endpoint == endpoint,
            ApiKeyPermission.method == method,
        )
        .first()
    )
    if not perm:
        raise HTTPException(status_code=403, detail=error(403, "无权调用此接口"))

    if perm.quota != -1 and perm.used_count >= perm.quota:
        raise HTTPException(status_code=429, detail=error(429, "调用次数已用完"))

    if not _check_rate_limit(key.id, perm):
        raise HTTPException(status_code=429, detail=error(429, "请求过于频繁，请稍后再试"))

    return key, perm


def log_api_key_usage(db: Session, api_key_id: int, endpoint: str, method: str, status_code: int) -> None:
    """记录 API Key 调用日志并更新已用次数"""
    db.add(ApiKeyUsageLog(
        api_key_id=api_key_id,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
    ))
    perm = (
        db.query(ApiKeyPermission)
        .filter(ApiKeyPermission.api_key_id == api_key_id, ApiKeyPermission.endpoint == endpoint, ApiKeyPermission.method == method)
        .first()
    )
    if perm:
        perm.used_count += 1
    db.commit()


def union_auth(
    request: Request,
    authorization: str | None = Header(None),
    x_api_key: str | None = Header(None),
) -> dict:
    """统一鉴权：先尝试 session/token 登录，再尝试 API Key

    Returns:
        {"type": "user", ...} 或 {"type": "api_key", "id": int, "perm": ...}
    """
    # 1. 尝试 session/token 鉴权
    token = _get_key_from_header(authorization)
    if token:
        payload = verify_token(token)
        if payload:
            return {"type": "user", **payload}

    # 2. 尝试 API Key 鉴权
    api_key_value = _get_api_key_from_header(x_api_key)
    if api_key_value:
        db = next(get_db())
        try:
            key, perm = validate_api_key(db, api_key_value, request.url.path, request.method)
            return {"type": "api_key", "id": key.id, "perm": perm}
        finally:
            db.close()

    raise HTTPException(status_code=401, detail=error(401, "请先登录或提供有效的 API Key"))


def require_user(authorization: str | None = Header(None)) -> dict:
    """仅允许已登录用户访问（用于管理接口）"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail=error(401, "请先登录"))
    payload = verify_token(authorization[7:])
    if not payload:
        raise HTTPException(status_code=401, detail=error(401, "Token 已过期或无效"))
    return payload
