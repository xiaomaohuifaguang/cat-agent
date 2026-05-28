from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import get_current_user
from app.core.response import error, success
from app.services.documents import DocumentService

router = APIRouter(tags=["文档解析"], dependencies=[Depends(get_current_user)])


@router.post("/parse")
def parse_document(file: UploadFile = File(...)):
    try:
        file_bytes = file.file.read()
        text = DocumentService.parse_file(
            file_bytes=file_bytes,
            filename=file.filename or "unknown",
            content_type=file.content_type,
        )
        return success(data={"text": text}, message="解析成功")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=error(400, str(e)))
    except Exception:
        raise HTTPException(status_code=500, detail=error(500, "解析失败，请稍后重试"))
