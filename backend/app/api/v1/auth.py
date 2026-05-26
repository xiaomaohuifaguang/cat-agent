from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.response import error, success
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest

router = APIRouter(tags=["认证"])


@router.post("/login")
def login(req: LoginRequest):
    if req.username != settings.USER or req.password != settings.PASSWORD:
        raise HTTPException(status_code=401, detail=error(401, "用户名或密码错误"))
    token = create_access_token({"sub": settings.USER})
    return success(data={"token": token}, message="登录成功")


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return success(data={"username": user.get("sub")}, message="获取成功")