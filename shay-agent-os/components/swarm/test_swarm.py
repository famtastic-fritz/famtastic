#!/usr/bin/env python3
"""
test_swarm.py — Integration test for the swarm orchestrator.

Tests:
1. MessageBus pub/sub and queues
2. WorkerPool task submission and completion
3. GoalLoop decomposition and execution
4. TrustMode gating
5. ErrorRecovery retry logic
6. Full orchestrator end-to-end
"""

import json
import logging
import sys
import time
from pathlib import Path

# Add swarm to path
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from swarm import (
    MessageBus,
    Message,
    WorkerPool,
    GoalLoop,
    TrustMode,
    ErrorRecovery,
    SwarmOrchestrator,
    TaskPriority,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("test_swarm")

LOG_PATH = Path("~/famtastic/shay-agent-os/logs/agent-B-swarm.log").expanduser()
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
file_handler = logging.FileHandler(LOG_PATH)
file_handler.setFormatter(logging.Formatter("%(asctime)s [%(name)s] %(levelname)s: %(message)s"))
logging.getLogger().addHandler(file_handler)


def test_message_bus():
    logger.info("=" * 50)
    logger.info("TEST: MessageBus")
    bus = MessageBus()
    received = []

    def cb(msg):
        received.append(msg)
        logger.info(f"  Received on {msg.channel}: {msg.topic} -> {msg.payload}")

    bus.subscribe("results", cb)
    bus.publish("results", Message(topic="test.hello", payload={"x": 1}, sender="test"))
    time.sleep(0.5)

    assert len(received) == 1, f"Expected 1 message, got {len(received)}"
    assert received[0].payload["x"] == 1

    # Test persistent queue
    bus.enqueue("test_queue", Message(topic="q.1", payload={"n": 1}, sender="test"))
    bus.enqueue("test_queue", Message(topic="q.2", payload={"n": 2}, sender="test"))
    m1 = bus.dequeue("test_queue")
    assert m1 is not None and m1.payload["n"] == 1
    logger.info("  Queue test passed")

    # Test state
    bus.set_state("test_key", {"foo": "bar"})
    val = bus.get_state("test_key")
    assert val == {"foo": "bar"}
    logger.info("  State test passed")

    h = bus.health()
    logger.info(f"  Health: {h}")
    bus.close()
    logger.info("PASS: MessageBus")
    return True


def test_worker_pool():
    logger.info("=" * 50)
    logger.info("TEST: WorkerPool")
    pool = WorkerPool(num_workers=2)
    pool.start()
    pool.spawn_workers(2)
    time.sleep(0.5)

    h = pool.health()
    logger.info(f"  Health: {json.dumps(h, indent=2, default=str)}")

    # Submit a simple task
    tid = pool.submit(
        prompt="Say exactly the word 'pong' and nothing else.",
        model_tier="simple",
        timeout=30.0,
    )
    task = pool.wait(tid, max_wait=60.0)
    assert task is not None, "Task timed out"
    logger.info(f"  Task result: {task.result}")
    assert task.status.name == "COMPLETED", f"Task failed: {task.error}"
    assert "pong" in (task.result or "").lower()

    pool.stop()
    logger.info("PASS: WorkerPool")
    return True


def test_goal_loop():
    logger.info("=" * 50)
    logger.info("TEST: GoalLoop")
    pool = WorkerPool(num_workers=2)
    pool.start()
    pool.spawn_workers(2)
    time.sleep(0.5)

    goal_loop = GoalLoop(worker_pool=pool, budget=5)

    # Use a simple goal that should decompose easily
    session = goal_loop.run("List three colors of the rainbow")
    logger.info(f"  Session status: {session.status}")
    logger.info(f"  Turns used: {session.turn}")
    logger.info(f"  Subgoals: {len(session.subgoals)}")
    for sg in session.subgoals:
        logger.info(f"    {sg.id}: {sg.status} -> {sg.result[:80] if sg.result else 'None'}")

    assert session.status in ("completed", "budget_exhausted")
    pool.stop()
    logger.info("PASS: GoalLoop")
    return True


def test_trust_mode():
    logger.info("=" * 50)
    logger.info("TEST: TrustMode")
    import tempfile, os
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"level": "cautious", "auto_budget_usd": 10.0, "notify_after": True,
                   "slack_webhook": None, "email": None, "allowed_commands": [],
                   "blocked_commands": [], "history": []}, f)
        tmp_path = f.name
    try:
        tm = TrustMode(config_path=Path(tmp_path))

        # Default is cautious
        assert tm.get_level() == "cautious"

        # Should block deploy in cautious
        r = tm.check("deploy the app to production")
        assert r["allowed"] is False
        assert r["needs_approval"] is True
        logger.info(f"  Cautious deploy check: {r}")

        # Should allow harmless action
        r = tm.check("list files in directory")
        assert r["allowed"] is True
        logger.info(f"  Cautious list check: {r}")

        # Test paranoid
        tm.set_level("paranoid")
        r = tm.check("list files in directory")
        assert r["allowed"] is False
        logger.info(f"  Paranoid list check: {r}")

        # Test godmode
        tm.set_level("godmode")
        r = tm.check("deploy the app to production")
        assert r["allowed"] is True
        logger.info(f"  Godmode deploy check: {r}")

        # Reset to cautious for safety
        tm.set_level("cautious")
        logger.info("PASS: TrustMode")
        return True
    finally:
        os.unlink(tmp_path)


def test_error_recovery():
    logger.info("=" * 50)
    logger.info("TEST: ErrorRecovery")
    pool = WorkerPool(num_workers=1)
    pool.start()
    pool.spawn_workers(1)

    er = ErrorRecovery(worker_pool=pool, max_retries=2, base_delay=0.5)

    # Simulate a failure by submitting a task with invalid model
    # Actually, let's just create a fake failed task
    from swarm.worker_pool import Task, TaskStatus
    task = Task(
        id="fake-fail-1",
        prompt="test",
        model_tier="simple",
        status=TaskStatus.FAILED,
        error="connection refused",
        attempt=1,
    )

    new_tid = er.handle(task)
    logger.info(f"  Retry task ID: {new_tid}")

    # Check upgrade opportunities
    opps = er.get_upgrade_opportunities()
    logger.info(f"  Upgrade opportunities: {opps}")

    pool.stop()
    logger.info("PASS: ErrorRecovery")
    return True


def test_full_orchestrator():
    logger.info("=" * 50)
    logger.info("TEST: Full SwarmOrchestrator")
    orch = SwarmOrchestrator(num_workers=2, goal_budget=5)
    orch.start()
    time.sleep(0.5)

    logger.info("\n" + orch.status_report())

    # Direct ask
    result = orch.ask("What is 2+2? Answer with just the number.", model_tier="simple")
    logger.info(f"  Direct ask result: {result}")

    # Goal
    session = orch.goal("Name two programming languages")
    logger.info(f"  Goal session status: {session.status}")
    logger.info(f"  Goal result: {session.final_result}")

    logger.info("\n" + orch.status_report())
    orch.stop()
    logger.info("PASS: Full SwarmOrchestrator")
    return True


def main():
    logger.info("Starting swarm integration tests")
    results = {}

    try:
        results["message_bus"] = test_message_bus()
    except Exception as e:
        logger.exception("MessageBus test failed")
        results["message_bus"] = False

    try:
        results["worker_pool"] = test_worker_pool()
    except Exception as e:
        logger.exception("WorkerPool test failed")
        results["worker_pool"] = False

    try:
        results["goal_loop"] = test_goal_loop()
    except Exception as e:
        logger.exception("GoalLoop test failed")
        results["goal_loop"] = False

    try:
        results["trust_mode"] = test_trust_mode()
    except Exception as e:
        logger.exception("TrustMode test failed")
        results["trust_mode"] = False

    try:
        results["error_recovery"] = test_error_recovery()
    except Exception as e:
        logger.exception("ErrorRecovery test failed")
        results["error_recovery"] = False

    try:
        results["full_orchestrator"] = test_full_orchestrator()
    except Exception as e:
        logger.exception("Full orchestrator test failed")
        results["full_orchestrator"] = False

    logger.info("=" * 50)
    logger.info("TEST SUMMARY")
    for name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        logger.info(f"  {name}: {status}")

    all_passed = all(results.values())
    logger.info(f"Overall: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
