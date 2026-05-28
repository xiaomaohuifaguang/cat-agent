from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile

from app.core.database import get_db
from app.core.api_key_auth import log_api_key_usage, union_auth
from app.core.response import error, success
from app.services.documents import DocumentService

router = APIRouter(tags=["文档解析"])


@router.post("/parse")
def parse_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    auth_info: dict = Depends(union_auth),
    db = Depends(get_db),
):
    try:
        file_bytes = file.file.read()
        result = DocumentService.parse_file(
            file_bytes=file_bytes,
            filename=file.filename or "unknown",
            content_type=file.content_type,
        )

        # 如果是 API Key 调用，记录日志
        if auth_info.get("type") == "api_key":
            background_tasks.add_task(
                log_api_key_usage,
                db,
                auth_info["id"],
                request.url.path,
                request.method,
                200,
            )

        return success(data=result, message="解析成功")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=error(400, str(e)))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail=error(500, "解析失败，请稍后重试"))
