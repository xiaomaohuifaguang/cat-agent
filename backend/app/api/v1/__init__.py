from fastapi import APIRouter

from app.api.v1 import auth, llm, system

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(system.router, prefix="/system")
api_router.include_router(llm.router, prefix="/llm")
