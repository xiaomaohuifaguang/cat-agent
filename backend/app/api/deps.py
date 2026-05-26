from fastapi import Header, HTTPException

from app.core.response import error
from app.core.security import verify_token


async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail=error(401, "认证头格式错误"))
    token = authorization[7:]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail=error(401, "Token 已过期或无效"))
    return payload