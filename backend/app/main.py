from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_router
from app.core.response import error
from app.models import LlmProvider, LlmSetting  # noqa: F401

app = FastAPI(title="CatAgent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(status_code=exc.status_code, content=error(exc.status_code, exc.detail))


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(status_code=500, content=error(500, "服务器内部错误"))


app.include_router(api_router)


@app.on_event("startup")
def startup():
    from app.core.database import Base, SessionLocal, engine
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from app.core.llm_cache import refresh_all_settings_cache
        refresh_all_settings_cache(db)
    except Exception:
        pass
    finally:
        db.close()