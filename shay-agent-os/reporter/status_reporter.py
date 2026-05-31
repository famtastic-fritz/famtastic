"""
reporter/status_reporter.py — Writes status to dashboard-accessible state.
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger("reporter.status")

STATE_PATH = Path.home() / "famtastic" / "shay-agent-os" / "state" / "dashboard-state.json"


class StatusReporter:
    """Reports system status to a JSON file the dashboard can read."""

    def __init__(self, state_path: Path | None = None):
        self.state_path = state_path or STATE_PATH
        self.state_path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, status: Dict[str, Any]) -> None:
        """Write status to the state file."""
        payload = {
            "timestamp": time.time(),
            "iso_time": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            **status,
        }
        try:
            with open(self.state_path, "w") as f:
                json.dump(payload, f, indent=2, default=str)
            logger.info(f"Status written to {self.state_path}")
        except Exception as exc:
            logger.error(f"Failed to write status: {exc}")

    def read(self) -> Dict[str, Any]:
        """Read the current status file."""
        if not self.state_path.exists():
            return {}
        try:
            with open(self.state_path) as f:
                return json.load(f)
        except Exception as exc:
            logger.error(f"Failed to read status: {exc}")
            return {}


def report_from_orchestrator(orch) -> None:
    """Convenience: extract status from orchestrator and write it."""
    reporter = StatusReporter()
    health = orch.health()
    wp = health.get("worker_pool", {})
    reporter.write({
        "status": "healthy" if wp.get("ollama_reachable") else "degraded",
        "agents": {
            "orchestrator": {"status": "running" if health.get("started") else "stopped"},
            "workers": wp.get("workers", {}),
        },
        "tasks": {
            "pending": wp.get("pending_tasks", 0),
            "completed": wp.get("completed_tasks", 0),
            "failed": wp.get("failed_tasks", 0),
        },
        "goals": {
            "active": health.get("active_goals", 0),
            "total": health.get("total_goals", 0),
        },
        "trust_level": health.get("trust_level", "unknown"),
    })
