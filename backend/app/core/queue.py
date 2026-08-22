import asyncio
import json
import logging
from typing import Optional, Callable, Awaitable
from app.core.config import settings

logger = logging.getLogger(__name__)


class EventQueue:
    """
    Asynchronous event queue supporting Redis backend with automatic in-memory fallback.
    """
    def __init__(self):
        self.redis_client = None
        self._memory_queue: asyncio.Queue = asyncio.Queue()
        self._is_redis_connected = False

    async def initialize(self):
        try:
            import redis.asyncio as aioredis
            self.redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=1.0
            )
            await self.redis_client.ping()
            self._is_redis_connected = True
            logger.info("Connected to Redis event queue")
        except Exception as e:
            self._is_redis_connected = False
            self.redis_client = None
            logger.info(f"Redis unavailable ({e}), using async in-memory queue fallback")

    async def push(self, channel: str, message: dict) -> bool:
        if self._is_redis_connected and self.redis_client:
            try:
                await self.redis_client.rpush(channel, json.dumps(message))
                return True
            except Exception as e:
                logger.warning(f"Redis push failed, falling back to memory queue: {e}")
        await self._memory_queue.put({"channel": channel, "data": message})
        return True

    async def pop(self, channel: str, timeout: float = 1.0) -> Optional[dict]:
        if self._is_redis_connected and self.redis_client:
            try:
                result = await self.redis_client.blpop(channel, timeout=int(timeout))
                if result:
                    _, data = result
                    return json.loads(data)
            except Exception as e:
                logger.warning(f"Redis pop failed, falling back to memory queue: {e}")
        try:
            item = await asyncio.wait_for(self._memory_queue.get(), timeout=timeout)
            if item.get("channel") == channel:
                return item.get("data")
            else:
                # Re-queue if for different channel
                await self._memory_queue.put(item)
                return None
        except asyncio.TimeoutError:
            return None


event_queue = EventQueue()
