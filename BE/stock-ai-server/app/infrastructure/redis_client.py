import json
import logging
from typing import Any, Optional
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class RedisClient:
    def __init__(self, url: str):
        self.url = url
        self._client: redis.Redis | None = None

    async def connect(self):
        self._client = await redis.from_url(self.url, decode_responses=True)
        logger.info("Redis connected")

    async def disconnect(self):
        if self._client:
            await self._client.close()
            logger.info("Redis disconnected")

    async def get(self, key: str) -> Optional[Any]:
        if not self._client:
            return None
        value = await self._client.get(key)
        if value is None:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    async def set(self, key: str, value: Any, ttl: int = 3600):
        if not self._client:
            return
        if isinstance(value, (dict, list)):
            value = json.dumps(value, ensure_ascii=False)
        await self._client.set(key, value, ex=ttl)

    async def delete(self, key: str):
        if not self._client:
            return
        await self._client.delete(key)
