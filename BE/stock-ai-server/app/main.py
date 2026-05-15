import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from app.api import health, analyze, recommend
from app.core.config import settings
from app.core.exceptions import BaseAppException, global_exception_handler, generic_exception_handler
from app.infrastructure.redis_client import RedisClient
from app.infrastructure.database import engine, Base
from app.core.dependencies import redis_client

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up stock-ai-server...")
    await redis_client.connect()
    # TODO: DB 테이블 생성 (필요시)
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    logger.info("Shutting down stock-ai-server...")
    await redis_client.disconnect()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Global exception handlers
app.add_exception_handler(BaseAppException, global_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Routers
app.include_router(health.router)
app.include_router(analyze.router)
app.include_router(recommend.router)
