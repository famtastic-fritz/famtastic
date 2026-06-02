"""
reporter/heartbeat.py — Monitors agent health every 30s.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from components.swarm import SwarmOrchestrator

logger = logging.getLogger("reporter.heartbeat")
LOG_PATH = Path.home() / "famtastic" / "shay-agent-os" / "logs" / "heartbeat.log"


def setup_logging() -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    handler = logging.FileHandler(LOG_PATH)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(name)s] %(levelname)s: %(message)s"
    ))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class HeartbeatMonitor:
    """Monitors the health of the swarm and writes heartbeat logs."""

    def __init__(
        self,
        orch: SwarmOrchestrator | None = None,
        interval: float = 30.0,
    ):
        self.orch = orch
        self.interval = interval
        self._stop = False
        self._history: List[Dict[str, Any]] = []

    def run_once(self) -> Dict[str, Any]:
        """Run a single heartbeat check."""
        if self.orch is None:
            self.orch = SwarmOrchestrator(num_workers=3, log_level="WARNING")
            self.orch.start()

        health = self.orch.health()
        wp = health.get("worker_pool", {})
        workers = wp.get("workers", {})

        now = time.time()
        stale_threshold = 60.0  # seconds

        stale_workers = []
        for wid, wdata in workers.items():
            last_beat = wdata.get("last_heartbeat", 0)
            if now - last_beat > stale_threshold:
                stale_workers.append(wid)

        report = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "started": health.get("started"),
            "trust_level": health.get("trust_level"),
            "redis_connected": health.get("message_bus", {}).get("connected"),
            "worker_count": len(workers),
            "pending_tasks": wp.get("pending_tasks", 0),
            "completed_tasks": wp.get("completed_tasks", 0),
            "failed_tasks": wp.get("failed_tasks", 0),
            "active_goals": health.get("active_goals"),
            "total_goals": health.get("total_goals"),
            "stale_workers": stale_workers,
            "ollama_reachable": wp.get("ollama_reachable", False),
        }

        self._history.append(report)
        if len(self._history) > 1000:
            self._history = self._history[-1000:]

        status = "HEALTHY" if not stale_workers and wp.get("ollama_reachable") else "DEGRADED"
        if stale_workers:
            status = "DEGRADED"
        if not wp.get("ollama_reachable"):
            status = "CRITICAL"

        report["status"] = status

        logger.info(f"Heartbeat: {status} | goals={report['active_goals']}/{report['total_goals']} | workers={report['worker_count']} | stale={stale_workers}")
        return report

    def run_loop(self) -> None:
        """Run heartbeat checks in a loop."""
        setup_logging()
        logger.info("Heartbeat monitor started")
        while not self._stop:
            try:
                self.run_once()
            except Exception as exc:
                logger.error(f"Heartbeat error: {exc}")
            time.sleep(self.interval)

    def stop(self) -> None:
        self._stop = True
        if self.orch:
            self.orch.stop()

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._history[-limit:]


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Agent OS Heartbeat Monitor")
    parser.add_argument("--once", action="store_true", help="Run a single heartbeat check and exit")
    args = parser.parse_args()

    monitor = HeartbeatMonitor()
    if args.once:
        setup_logging()
        report = monitor.run_once()
        print(json.dumps(report, indent=2, default=str))
        if monitor.orch:
            monitor.orch.stop()
    else:
        try:
            monitor.run_loop()
        except KeyboardInterrupt:
            monitor.stop()
            logger.info("Heartbeat monitor stopped")


if __name__ == "__main__":
    main()
