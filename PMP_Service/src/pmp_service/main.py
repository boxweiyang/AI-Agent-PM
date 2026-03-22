from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pmp_service.core.config import settings
from pmp_service.features.ai_gateway.router import router as ai_gateway_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # 启动/关闭钩子：后续接引擎 dispose、缓存等
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_v1 = APIRouter(prefix="/api/v1")


@api_v1.get("/health")
async def health():
    return {"code": 0, "message": "ok", "data": {"status": "up"}}


api_v1.include_router(ai_gateway_router)
app.include_router(api_v1)
