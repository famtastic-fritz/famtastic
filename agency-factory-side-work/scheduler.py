"""In-process self-scheduler. Runs entirely inside the orchestrator process.

It NEVER touches the OS crontab/launchd/systemd. It adapts its own cadence to
queue depth: deep queue -> tighten the interval (work harder); shallow/empty
queue -> back off (save cycles). When the process exits, scheduling stops.
"""
from __future__ import annotations

import threading
import time

from config_io import load_config


def next_interval(queue_depth: int) -> float:
    """Adaptive cadence: more pending work => shorter interval."""
    s = load_config()["scheduler"]
    base = s["base_interval_seconds"]
    lo, hi = s["min_interval_seconds"], s["max_interval_seconds"]
    deep, shallow = s["deep_queue_threshold"], s["shallow_queue_threshold"]

    if queue_depth >= deep:
        interval = lo  # surge: hit it hard
    elif queue_depth <= shallow:
        interval = min(hi, base * 3)  # back off when nearly idle
    else:
        # linear interpolate between base and lo as depth grows
        span = max(1, deep - shallow)
        frac = (queue_depth - shallow) / span
        interval = base - frac * (base - lo)
    return float(max(lo, min(hi, interval)))


class Scheduler:
    """Background recurring runner. Used for daemon mode; bounded runs call
    next_interval directly. Either way, all in-process."""

    def __init__(self, job, depth_fn):
        self.job = job
        self.depth_fn = depth_fn
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def _loop(self) -> None:
        while not self._stop.is_set():
            self.job()
            interval = next_interval(self.depth_fn())
            self._stop.wait(interval)

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)
