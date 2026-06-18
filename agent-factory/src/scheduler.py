"""In-process, sandbox-only scheduler.

This is the "self-scheduling" cadence controller. It NEVER touches the real system
crontab — it is a pure in-process loop. The orchestrator asks it how long to sleep
before the next supervision tick; cadence is a function of queue depth so a deep
queue is polled aggressively and an empty queue backs off.
"""


def next_tick_seconds(queue_depth, sched_cfg):
    """Adaptive cadence: deeper queue -> shorter sleep (more aggressive scheduling)."""
    lo = sched_cfg.get("min_tick_seconds", 1)
    hi = sched_cfg.get("max_tick_seconds", 10)
    deep = max(1, sched_cfg.get("deep_queue_depth", 6))
    if queue_depth <= 0:
        return hi
    # Linear interpolation: at/above `deep` items -> min tick; empty -> max tick.
    frac = min(1.0, queue_depth / deep)
    return round(hi - (hi - lo) * frac, 2)


def desired_workers(queue_depth, max_concurrency):
    """How many workers to have running this tick: scale to demand, capped."""
    if queue_depth <= 0:
        return 0
    return min(max_concurrency, queue_depth)
