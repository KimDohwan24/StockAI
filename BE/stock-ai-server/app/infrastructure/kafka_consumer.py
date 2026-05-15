import asyncio
import json
import logging
from typing import Callable, List

from aiokafka import AIOKafkaConsumer
from app.core.config import settings

logger = logging.getLogger(__name__)


class KafkaConsumer:
    def __init__(
        self,
        topics: List[str],
        bootstrap_servers: str = settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id: str = "stock-ai-server",
    ):
        self.topics = topics
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self._consumer: AIOKafkaConsumer | None = None
        self._handlers: List[Callable[[dict], None]] = []

    def add_handler(self, handler: Callable[[dict], None]):
        self._handlers.append(handler)

    async def start(self):
        self._consumer = AIOKafkaConsumer(
            *self.topics,
            bootstrap_servers=self.bootstrap_servers,
            group_id=self.group_id,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        )
        await self._consumer.start()
        logger.info(f"Kafka consumer started for topics: {self.topics}")
        asyncio.create_task(self._consume())

    async def _consume(self):
        try:
            async for msg in self._consumer:
                data = msg.value
                logger.debug(f"Received message: {data}")
                for handler in self._handlers:
                    try:
                        handler(data)
                    except Exception as e:
                        logger.error(f"Handler error: {e}", exc_info=True)
        except asyncio.CancelledError:
            logger.info("Kafka consumer cancelled")
        finally:
            await self.stop()

    async def stop(self):
        if self._consumer:
            await self._consumer.stop()
            logger.info("Kafka consumer stopped")
