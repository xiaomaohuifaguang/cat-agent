from fastapi import APIRouter

from app.core.response import success

router = APIRouter(tags=["系统"])


@router.get("/health")
def health():
    return success(data={"status": "ok"}, message="服务正常")