import base64

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.auth import LoginRequest, LoginResponse

router = APIRouter(tags=["认证"])


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    if req.username != settings.USER or req.password != settings.PASSWORD:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = base64.b64encode(f"{settings.USER}:{settings.PASSWORD}".encode()).decode()
    return {"token": token}
