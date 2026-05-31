"""
Swarm Orchestrator for Shay Agent OS.

Components:
- message_bus: Redis-based pub/sub for inter-agent communication
- worker_pool: Ollama worker management with model tiering
- goal_loop: Goal decomposition and execution loop
- trust_mode: Configurable autonomy levels
- error_recovery: Retry, escalation, and failure logging
"""

__version__ = "0.1.0"

from .message_bus import MessageBus, Message
from .worker_pool import WorkerPool, TaskPriority
from .goal_loop import GoalLoop
from .trust_mode import TrustMode, TrustLevel
from .error_recovery import ErrorRecovery, RecoveryStrategy
from .swarm_orchestrator import SwarmOrchestrator

__all__ = [
    "MessageBus",
    "Message",
    "WorkerPool",
    "TaskPriority",
    "GoalLoop",
    "TrustMode",
    "TrustLevel",
    "ErrorRecovery",
    "RecoveryStrategy",
    "SwarmOrchestrator",
]
