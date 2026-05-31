"""
reporter/blocker_detector.py — Detects stuck agents and escalates.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("reporter.blocker")

BLOCKER_LOG = Path.home() / "famtastic" / "shay-agent-os" / "state" / "blockers.json"


@dataclass
class Blocker:
    id: str
    description: str
    agent_id: Optional[str]
    detected_at: float = field(default_factory=time.time)
    escalated: bool = False
    resolved: bool = False
    attempts: int = 0
    escalation_count: int = 0


class BlockerDetector:
    """Detects stuck agents and tracks escalation."""

    def __init__(self, stale_threshold: float = 120.0, max_attempts: int = 3):
        self.stale_threshold = stale_threshold
        self.max_attempts = max_attempts
        self._blockers: List[Blocker] = []
        self._load()

    def _load(self) -> None:
        if BLOCKER_LOG.exists():
            try:
                with open(BLOCKER_LOG) as f:
                    data = json.load(f)
                for b in data:
                    self._blockers.append(Blocker(**b))
            except Exception as exc:
                logger.warning(f"Failed to load blockers: {exc}")

    def _save(self) -> None:
        BLOCKER_LOG.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(BLOCKER_LOG, "w") as f:
                json.dump([
                    {
                        "id": b.id,
                        "description": b.description,
                        "agent_id": b.agent_id,
                        "detected_at": b.detected_at,
                        "escalated": b.escalated,
                        "resolved": b.resolved,
                        "attempts": b.attempts,
                        "escalation_count": b.escalation_count,
                    }
                    for b in self._blockers
                ], f, indent=2, default=str)
        except Exception as exc:
            logger.error(f"Failed to save blockers: {exc}")

    def check(self, health: Dict[str, Any]) -> List[Blocker]:
        """Check health dict for stuck agents. Returns new blockers."""
        new_blockers = []
        wp = health.get("worker_pool", {})
        workers = wp.get("workers", {})
        now = time.time()

        for wid, wdata in workers.items():
            last_beat = wdata.get("last_heartbeat", 0)
            if now - last_beat > self.stale_threshold:
                # Check if we already have an open blocker for this worker
                existing = [b for b in self._blockers if b.agent_id == wid and not b.resolved]
                if not existing:
                    blocker = Blocker(
                        id=f"blocker-{int(now*1000)}",
                        description=f"Worker {wid} stale for {int(now - last_beat)}s",
                        agent_id=wid,
                    )
                    self._blockers.append(blocker)
                    new_blockers.append(blocker)
                    logger.warning(f"New blocker detected: {blocker.description}")

        # Check for pending tasks stuck too long
        pending = wp.get("pending_tasks", 0)
        if pending > 10:
            existing = [b for b in self._blockers if b.description.startswith("High pending") and not b.resolved]
            if not existing:
                blocker = Blocker(
                    id=f"blocker-{int(now*1000)}-queue",
                    description=f"High pending task count: {pending}",
                    agent_id=None,
                )
                self._blockers.append(blocker)
                new_blockers.append(blocker)

        self._save()
        return new_blockers

    def escalate(self, blocker_id: str) -> bool:
        """Escalate a blocker. Returns True if max escalations reached."""
        for b in self._blockers:
            if b.id == blocker_id and not b.resolved:
                b.escalation_count += 1
                b.escalated = True
                b.attempts += 1
                logger.error(f"Blocker {blocker_id} escalated (count={b.escalation_count})")
                if b.escalation_count >= self.max_attempts:
                    logger.critical(f"Blocker {blocker_id} reached max escalations — needs human attention")
                    self._notify_human(b)
                    return True
                self._save()
                return False
        return False

    def resolve(self, blocker_id: str) -> None:
        for b in self._blockers:
            if b.id == blocker_id and not b.resolved:
                b.resolved = True
                logger.info(f"Blocker {blocker_id} resolved")
        self._save()

    def _notify_human(self, blocker: Blocker) -> None:
        """Write a notification file for human attention."""
        notify_path = Path.home() / "famtastic" / "logs" / "AGENT_OS_HUMAN_ESCALATION.txt"
        notify_path.parent.mkdir(parents=True, exist_ok=True)
        with open(notify_path, "a") as f:
            f.write(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] ESCALATION: {blocker.description} (agent={blocker.agent_id})\n")
        logger.critical(f"Human escalation written to {notify_path}")

    def list_open(self) -> List[Blocker]:
        return [b for b in self._blockers if not b.resolved]

    def to_dict(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": b.id,
                "description": b.description,
                "agent_id": b.agent_id,
                "detected_at": b.detected_at,
                "escalated": b.escalated,
                "resolved": b.resolved,
                "escalation_count": b.escalation_count,
            }
            for b in self._blockers
        ]
