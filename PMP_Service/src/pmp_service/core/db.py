"""异步数据库引擎与会话工厂（模型与迁移后续按 Alembic 补齐）。"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from pmp_service.core.config import settings

engine = create_async_engine(settings.database_url, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db():
    """FastAPI 依赖占位：后续各路由注入。"""
    async with SessionLocal() as session:
        yield session
