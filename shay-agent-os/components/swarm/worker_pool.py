"""
worker_pool.py — Manages Ollama workers.

Can spawn N workers, assign tasks, collect results, handle timeouts.
Workers use cheap models:
  - qwen2.5:1.5b  → simple tasks
  - phi4-mini     → medium tasks
  - hermes3       → complex tasks
"""

from __future__ import annotations

import json
import logging
import queue
import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple

import requests

logger = logging.getLogger("swarm.worker_pool")

OLLAMA_HOST = "http://localhost:11434"


class TaskPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


@dataclass
class Task:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    prompt: str = ""
    model_tier: str = "simple"   # simple | medium | complex
    priority: TaskPriority = TaskPriority.NORMAL
    timeout: float = 60.0
    max_retries: int = 2
    context: Dict[str, Any] = field(default_factory=dict)
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[str] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    finished_at: Optional[float] = None
    worker_id: Optional[str] = None
    attempt: int = 0


@dataclass
class Worker:
    id: str
    model: str
    thread: threading.Thread
    task_queue: queue.Queue
    stop_event: threading.Event
    status: str = "idle"   # idle | busy | stopped
    total_tasks: int = 0
    failed_tasks: int = 0
    last_heartbeat: float = field(default_factory=time.time)


MODEL_MAP = {
    "simple": "qwen2.5:1.5b",
    "medium": "phi4-mini:latest",
    "complex": "hermes3:latest",
}


def _call_ollama(model: str, prompt: str, timeout: float = 60.0) -> str:
    """Call Ollama generate API."""
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 512,
        },
    }
    resp = requests.post(url, json=payload, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    return data.get("response", "").strip()


def _call_ollama_chat(model: str, messages: List[Dict[str, str]], timeout: float = 60.0) -> str:
    """Call Ollama chat API."""
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 512,
        },
    }
    resp = requests.post(url, json=payload, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    return data.get("message", {}).get("content", "").strip()


class WorkerPool:
    """
    Pool of Ollama-backed workers.
    """

    def __init__(
        self,
        num_workers: int = 3,
        default_timeout: float = 60.0,
        ollama_host: str = OLLAMA_HOST,
    ):
        self.num_workers = num_workers
        self.default_timeout = default_timeout
        self.ollama_host = ollama_host
        self._workers: Dict[str, Worker] = {}
        self._task_queue: queue.PriorityQueue = queue.PriorityQueue()
        self._results: Dict[str, Task] = {}
        self._callbacks: Dict[str, List[Callable[[Task], None]]] = {}
        self._lock = threading.Lock()
        self._shutdown = False
        self._orchestrator_thread: Optional[threading.Thread] = None

        # Verify Ollama is reachable
        self._ollama_ok = self._check_ollama()

    def _check_ollama(self) -> bool:
        try:
            r = requests.get(f"{self.ollama_host}/api/tags", timeout=5)
            r.raise_for_status()
            models = [m["name"] for m in r.json().get("models", [])]
            logger.info(f"Ollama reachable. Models: {models}")
            return True
        except Exception as exc:
            logger.error(f"Ollama not reachable at {self.ollama_host}: {exc}")
            return False

    # ------------------------------------------------------------------
    # Worker lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Start the orchestrator and spawn workers."""
        if not self._ollama_ok:
            logger.warning("Ollama not available. Workers will fail tasks immediately.")

        self._shutdown = False
        self._orchestrator_thread = threading.Thread(target=self._orchestrator_loop, daemon=True)
        self._orchestrator_thread.start()
        logger.info(f"WorkerPool started with orchestrator thread.")

    def spawn_workers(self, count: Optional[int] = None) -> None:
        """Spawn worker threads. Each worker can handle any model tier."""
        count = count or self.num_workers
        for i in range(count):
            wid = f"worker-{i+1}"
            w = Worker(
                id=wid,
                model="",  # determined per-task
                thread=None,
                task_queue=queue.Queue(),
                stop_event=threading.Event(),
            )
            t = threading.Thread(target=self._worker_loop, args=(w,), daemon=True)
            w.thread = t
            t.start()
            self._workers[wid] = w
            logger.info(f"Spawned {wid}")

    def stop(self) -> None:
        """Graceful shutdown."""
        self._shutdown = True
        for w in self._workers.values():
            w.stop_event.set()
        for w in self._workers.values():
            w.thread.join(timeout=3)
        if self._orchestrator_thread:
            self._orchestrator_thread.join(timeout=3)
        logger.info("WorkerPool stopped.")

    # ------------------------------------------------------------------
    # Task submission
    # ------------------------------------------------------------------

    def submit(
        self,
        prompt: str,
        model_tier: str = "simple",
        priority: TaskPriority = TaskPriority.NORMAL,
        timeout: Optional[float] = None,
        max_retries: int = 2,
        context: Optional[Dict[str, Any]] = None,
        callback: Optional[Callable[[Task], None]] = None,
    ) -> str:
        """Submit a task. Returns task ID."""
        task = Task(
            prompt=prompt,
            model_tier=model_tier,
            priority=priority,
            timeout=timeout or self.default_timeout,
            max_retries=max_retries,
            context=context or {},
        )
        with self._lock:
            self._results[task.id] = task
            if callback:
                self._callbacks.setdefault(task.id, []).append(callback)

        # PriorityQueue uses lowest-first, so negate priority
        self._task_queue.put((-priority.value, time.time(), task.id, task))
        logger.info(f"Submitted task {task.id} (tier={model_tier}, prio={priority.name})")
        return task.id

    def submit_chat(
        self,
        messages: List[Dict[str, str]],
        model_tier: str = "simple",
        priority: TaskPriority = TaskPriority.NORMAL,
        timeout: Optional[float] = None,
        max_retries: int = 2,
        context: Optional[Dict[str, Any]] = None,
        callback: Optional[Callable[[Task], None]] = None,
    ) -> str:
        """Submit a chat-formatted task."""
        prompt = json.dumps({"messages": messages, "format": "chat"})
        task = Task(
            prompt=prompt,
            model_tier=model_tier,
            priority=priority,
            timeout=timeout or self.default_timeout,
            max_retries=max_retries,
            context=context or {},
        )
        with self._lock:
            self._results[task.id] = task
            if callback:
                self._callbacks.setdefault(task.id, []).append(callback)
        self._task_queue.put((-priority.value, time.time(), task.id, task))
        logger.info(f"Submitted chat task {task.id} (tier={model_tier})")
        return task.id

    def get_task(self, task_id: str) -> Optional[Task]:
        with self._lock:
            return self._results.get(task_id)

    def wait(self, task_id: str, poll_interval: float = 0.2, max_wait: float = 300.0) -> Optional[Task]:
        """Block until task completes or max_wait exceeded."""
        deadline = time.time() + max_wait
        while time.time() < deadline:
            task = self.get_task(task_id)
            if task and task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.TIMEOUT, TaskStatus.CANCELLED):
                return task
            time.sleep(poll_interval)
        logger.warning(f"wait() timed out for task {task_id}")
        return self.get_task(task_id)

    # ------------------------------------------------------------------
    # Orchestrator loop
    # ------------------------------------------------------------------

    def _orchestrator_loop(self) -> None:
        """Distribute tasks from the priority queue to idle workers."""
        while not self._shutdown:
            try:
                # Find idle workers
                idle_workers = [w for w in self._workers.values() if w.status == "idle"]
                if not idle_workers:
                    time.sleep(0.1)
                    continue

                # Get next task (non-blocking)
                try:
                    _, _, tid, task = self._task_queue.get(timeout=0.5)
                except queue.Empty:
                    continue

                # Assign to first idle worker
                worker = idle_workers[0]
                worker.status = "busy"
                worker.task_queue.put(task)
                logger.debug(f"Assigned task {tid} to {worker.id}")

            except Exception as exc:
                logger.error(f"Orchestrator loop error: {exc}")
                time.sleep(0.5)

    # ------------------------------------------------------------------
    # Worker loop
    # ------------------------------------------------------------------

    def _worker_loop(self, worker: Worker) -> None:
        """Individual worker thread."""
        while not worker.stop_event.is_set():
            try:
                task: Task = worker.task_queue.get(timeout=1.0)
            except queue.Empty:
                worker.status = "idle"
                worker.last_heartbeat = time.time()
                continue

            worker.status = "busy"
            worker.total_tasks += 1
            task.worker_id = worker.id
            task.started_at = time.time()
            task.status = TaskStatus.RUNNING
            task.attempt += 1

            model = MODEL_MAP.get(task.model_tier, MODEL_MAP["simple"])
            worker.model = model
            logger.info(f"[{worker.id}] Running task {task.id} on {model}")

            try:
                # Detect chat format
                parsed = json.loads(task.prompt)
                is_chat = isinstance(parsed, dict) and parsed.get("format") == "chat"
            except json.JSONDecodeError:
                is_chat = False

            try:
                if not self._ollama_ok:
                    raise RuntimeError("Ollama not available")

                if is_chat:
                    messages = json.loads(task.prompt)["messages"]
                    result = _call_ollama_chat(model, messages, timeout=task.timeout)
                else:
                    result = _call_ollama(model, task.prompt, timeout=task.timeout)

                task.result = result
                task.status = TaskStatus.COMPLETED
                task.finished_at = time.time()
                logger.info(f"[{worker.id}] Task {task.id} completed ({len(result)} chars)")

            except requests.exceptions.Timeout:
                task.status = TaskStatus.TIMEOUT
                task.error = "Ollama request timed out"
                task.finished_at = time.time()
                worker.failed_tasks += 1
                logger.warning(f"[{worker.id}] Task {task.id} timed out")

            except Exception as exc:
                task.status = TaskStatus.FAILED
                task.error = str(exc)
                task.finished_at = time.time()
                worker.failed_tasks += 1
                logger.error(f"[{worker.id}] Task {task.id} failed: {exc}")

            # Update stored result
            with self._lock:
                self._results[task.id] = task

            # Fire callbacks
            for cb in self._callbacks.get(task.id, []):
                try:
                    cb(task)
                except Exception as exc:
                    logger.error(f"Task callback error: {exc}")

            worker.status = "idle"
            worker.last_heartbeat = time.time()

    # ------------------------------------------------------------------
    # Health & stats
    # ------------------------------------------------------------------

    def health(self) -> Dict[str, Any]:
        return {
            "ollama_reachable": self._ollama_ok,
            "workers": {
                wid: {
                    "status": w.status,
                    "model": w.model,
                    "total_tasks": w.total_tasks,
                    "failed_tasks": w.failed_tasks,
                    "last_heartbeat": w.last_heartbeat,
                }
                for wid, w in self._workers.items()
            },
            "pending_tasks": self._task_queue.qsize(),
            "completed_tasks": sum(1 for t in self._results.values() if t.status == TaskStatus.COMPLETED),
            "failed_tasks": sum(1 for t in self._results.values() if t.status == TaskStatus.FAILED),
        }
