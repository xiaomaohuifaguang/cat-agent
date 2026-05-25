from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.core.database import engine

router = APIRouter(tags=["系统"])


@router.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"数据库连接失败: {str(e)}")
