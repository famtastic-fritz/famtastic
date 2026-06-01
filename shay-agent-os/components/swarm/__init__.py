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
from .brain_client import BrainChain, BrainAvailabilityCheck
from .dispatcher import Dispatcher, DispatchTask, DispatchResult
from .local_swarm_dispatcher import LocalSwarmDispatcher
from .asyncio_dispatcher import AsyncioDispatcher
from .pipeline import (
    agent, parallel, pipeline,
    adversarial_verify, judge_panel, loop_until_dry, completeness_critic,
    load_policy, run_job, code_job, JobResult,
    vault_search, context_loader, write_file, shell,
    list_skills, get_skill, use_skill,
    ground_claim, plan_completeness_gate, capture_planning_lesson, prior_planning_lessons,
    planning_loop, refine_to_target, synthesize_sections,
    multi_file_code_job, build_app, runtime_render_gate, surgical_patch,
)
from .goal_loop import GoalLoop
from .trust_mode import TrustMode, TrustLevel
from .error_recovery import ErrorRecovery, RecoveryStrategy
from .swarm_orchestrator import SwarmOrchestrator

__all__ = [
    "MessageBus", "Message",
    "WorkerPool", "TaskPriority",
    "BrainChain", "BrainAvailabilityCheck",
    "Dispatcher", "DispatchTask", "DispatchResult",
    "LocalSwarmDispatcher", "AsyncioDispatcher",
    "agent", "parallel", "pipeline",
    "adversarial_verify", "judge_panel", "loop_until_dry", "completeness_critic",
    "load_policy", "run_job", "code_job", "JobResult",
    "vault_search", "context_loader", "write_file", "shell",
    "list_skills", "get_skill", "use_skill",
    "ground_claim", "plan_completeness_gate", "capture_planning_lesson", "prior_planning_lessons",
    "planning_loop", "refine_to_target", "synthesize_sections", "multi_file_code_job", "build_app", "runtime_render_gate", "surgical_patch",
    "GoalLoop",
    "TrustMode", "TrustLevel",
    "ErrorRecovery", "RecoveryStrategy",
    "SwarmOrchestrator",
]
