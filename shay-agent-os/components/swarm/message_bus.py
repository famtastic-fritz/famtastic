"""
message_bus.py — Redis-based pub/sub for inter-agent communication.

Channels:
  - orchestrator: Commands from the orchestrator to workers
  - workers: Worker heartbeat and status updates
  - results: Task results from workers
  - errors: Error reports and escalation

Also supports persistent message queues for reliable delivery.
"""

from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set

logger = logging.getLogger("swarm.message_bus")


@dataclass
class Message:
    """A message on the bus."""
    topic: str
    payload: Dict[str, Any]
    sender: str = "unknown"
    msg_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    timestamp: float = field(default_factory=time.time)
    channel: str = ""

    def to_json(self) -> str:
        return json.dumps(asdict(self), default=str)

    @classmethod
    def from_json(cls, raw: str) -> "Message":
        data = json.loads(raw)
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


class MessageBus:
    """
    Redis-backed message bus with pub/sub and persistent queues.
    Falls back to in-memory mode if Redis is unavailable.
    """

    CHANNELS = ["orchestrator", "workers", "results", "errors"]

    def __init__(
        self,
        redis_host: str = "localhost",
        redis_port: int = 6379,
        redis_db: int = 0,
        namespace: str = "swarm",
    ):
        self.namespace = namespace
        self._redis_host = redis_host
        self._redis_port = redis_port
        self._redis_db = redis_db
        self._redis = None
        self._pubsub = None
        self._listeners: Dict[str, List[Callable[[Message], None]]] = {ch: [] for ch in self.CHANNELS}
        self._sub_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._memory_queue: List[Message] = []  # fallback
        self._memory_state: Dict[str, Any] = {}  # fallback for set_state/get_state
        self._lock = threading.Lock()
        self._connected = False

        self._connect()

    def _connect(self) -> bool:
        """Attempt Redis connection. Return True on success."""
        try:
            import redis as redis_lib
            self._redis = redis_lib.Redis(
                host=self._redis_host,
                port=self._redis_port,
                db=self._redis_db,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            self._redis.ping()
            self._pubsub = self._redis.pubsub(ignore_subscribe_messages=True)
            self._connected = True
            logger.info(f"MessageBus connected to Redis at {self._redis_host}:{self._redis_port}")
            return True
        except Exception as exc:
            self._connected = False
            logger.warning(f"Redis unavailable ({exc}). Running in-memory fallback.")
            return False

    # ------------------------------------------------------------------
    # Pub/Sub
    # ------------------------------------------------------------------

    def publish(self, channel: str, message: Message) -> bool:
        """Publish a message to a channel."""
        if channel not in self.CHANNELS:
            logger.warning(f"Publishing to unknown channel: {channel}")
        message.channel = channel
        raw = message.to_json()
        if self._connected and self._redis:
            try:
                self._redis.publish(self._channel_key(channel), raw)
                logger.debug(f"Published to {channel}: {message.msg_id}")
                return True
            except Exception as exc:
                logger.error(f"Redis publish failed ({exc}), falling back to memory.")
        # In-memory fallback
        with self._lock:
            self._memory_queue.append(message)
        self._notify_memory_listeners(channel, message)
        return True

    def subscribe(self, channel: str, callback: Callable[[Message], None]) -> None:
        """Subscribe a callback to a channel."""
        if channel not in self._listeners:
            self._listeners[channel] = []
        self._listeners[channel].append(callback)
        logger.info(f"Subscribed callback to {channel} (total={len(self._listeners[channel])})")

        if self._connected and self._pubsub:
            try:
                self._pubsub.subscribe(self._channel_key(channel))
                if self._sub_thread is None or not self._sub_thread.is_alive():
                    self._start_listener_thread()
            except Exception as exc:
                logger.error(f"Redis subscribe failed: {exc}")

    def unsubscribe(self, channel: str, callback: Callable[[Message], None]) -> None:
        """Remove a callback from a channel."""
        if channel in self._listeners and callback in self._listeners[channel]:
            self._listeners[channel].remove(callback)

    def _channel_key(self, channel: str) -> str:
        return f"{self.namespace}:channel:{channel}"

    def _start_listener_thread(self) -> None:
        self._stop_event.clear()
        self._sub_thread = threading.Thread(target=self._listen_loop, daemon=True)
        self._sub_thread.start()
        logger.info("Listener thread started.")

    def _listen_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                if self._pubsub:
                    msg = self._pubsub.get_message(timeout=0.5)
                    if msg and msg["type"] == "message":
                        self._dispatch(msg["channel"].split(":")[-1], msg["data"])
            except Exception as exc:
                logger.error(f"Listener loop error: {exc}")
                time.sleep(1)

    def _dispatch(self, channel: str, raw: str) -> None:
        try:
            message = Message.from_json(raw)
        except json.JSONDecodeError:
            logger.error(f"Failed to decode message on {channel}: {raw[:200]}")
            return
        for cb in self._listeners.get(channel, []):
            try:
                cb(message)
            except Exception as exc:
                logger.error(f"Callback error on {channel}: {exc}")

    def _notify_memory_listeners(self, channel: str, message: Message) -> None:
        for cb in self._listeners.get(channel, []):
            try:
                cb(message)
            except Exception as exc:
                logger.error(f"Memory callback error on {channel}: {exc}")

    # ------------------------------------------------------------------
    # Persistent queues
    # ------------------------------------------------------------------

    def enqueue(self, queue_name: str, message: Message) -> bool:
        """Push to a persistent list (queue)."""
        key = f"{self.namespace}:queue:{queue_name}"
        message.channel = queue_name
        raw = message.to_json()
        if self._connected and self._redis:
            try:
                self._redis.lpush(key, raw)
                return True
            except Exception as exc:
                logger.error(f"Redis enqueue failed: {exc}")
        with self._lock:
            self._memory_queue.append(message)
        return True

    def dequeue(self, queue_name: str, timeout: float = 0.0) -> Optional[Message]:
        """Pop from a persistent list (queue). Blocking if timeout > 0."""
        key = f"{self.namespace}:queue:{queue_name}"
        if self._connected and self._redis:
            try:
                if timeout > 0:
                    result = self._redis.brpop(key, timeout=int(timeout))
                    if result:
                        return Message.from_json(result[1])
                else:
                    raw = self._redis.rpop(key)
                    if raw:
                        return Message.from_json(raw)
            except Exception as exc:
                logger.error(f"Redis dequeue failed: {exc}")
        # Memory fallback
        with self._lock:
            for i, m in enumerate(self._memory_queue):
                if m.channel == queue_name or queue_name in m.topic:
                    return self._memory_queue.pop(i)
        return None

    def queue_length(self, queue_name: str) -> int:
        key = f"{self.namespace}:queue:{queue_name}"
        if self._connected and self._redis:
            try:
                return self._redis.llen(key) or 0
            except Exception:
                pass
        with self._lock:
            return len(self._memory_queue)

    # ------------------------------------------------------------------
    # State / KV
    # ------------------------------------------------------------------

    def set_state(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        full_key = f"{self.namespace}:state:{key}"
        raw = json.dumps(value, default=str)
        if self._connected and self._redis:
            try:
                self._redis.set(full_key, raw, ex=ttl)
                return True
            except Exception as exc:
                logger.error(f"Redis set_state failed: {exc}")
        with self._lock:
            self._memory_state[full_key] = raw
        return True

    def get_state(self, key: str) -> Optional[Any]:
        full_key = f"{self.namespace}:state:{key}"
        if self._connected and self._redis:
            try:
                raw = self._redis.get(full_key)
                if raw:
                    return json.loads(raw)
            except Exception as exc:
                logger.error(f"Redis get_state failed: {exc}")
        with self._lock:
            raw = self._memory_state.get(full_key)
            if raw:
                return json.loads(raw)
        return None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        self._stop_event.set()
        if self._sub_thread:
            self._sub_thread.join(timeout=2)
        if self._pubsub:
            try:
                self._pubsub.close()
            except Exception:
                pass
        if self._redis:
            try:
                self._redis.close()
            except Exception:
                pass
        logger.info("MessageBus closed.")

    def health(self) -> Dict[str, Any]:
        return {
            "connected": self._connected,
            "channels": self.CHANNELS,
            "listeners": {k: len(v) for k, v in self._listeners.items()},
            "memory_queue_size": len(self._memory_queue),
        }
