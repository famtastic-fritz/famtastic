"""
dispatcher.py — Phase 2: Dispatcher protocol (abstract contract).

This is the seam that keeps the swarm brain-agnostic and the dispatch substrate
swappable. GoalLoop, TrustMode, ErrorRecovery all depend ONLY on this protocol
— never on a specific implementation.

Implementations:
  LocalSwarmDispatcher  — Phase 1 WorkerPool + BrainChain (default, ships now)
  AsyncioDispatcher     — semaphore-bounded asyncio stub (grows to production)

The checkpoint contract (JSONL) makes jobs resumable across crashes/reboots.
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Task + Result contracts (shared across all implementations)
# ---------------------------------------------------------------------------

@dataclass
class DispatchTask:
    id: str
    prompt: str
    brain: str = "auto"          # auto | claude | openrouter | gemini | ollama
    tier: str = "medium"         # medium | complex (simple/qwen dropped Phase 1)
    timeout: float = 90.0
    context: Dict[str, Any] = field(default_factory=dict)
    skill_file: Optional[str] = None # Path to SKILL.md for dynamic injection


@dataclass
class DispatchResult:
    task_id: str
    status: str                  # completed | failed | timeout
    output: Optional[str] = None
    error: Optional[str] = None
    brain_used: Optional[str] = None
    elapsed: float = 0.0


# ---------------------------------------------------------------------------
# Dispatcher ABC — the contract
# ---------------------------------------------------------------------------

class Dispatcher(ABC):
    """
    Abstract dispatch substrate. Every implementation must satisfy:
      fan_out()             — submit N tasks, block until all done
      export_checkpoint()   — serialize in-flight state to JSONL
      import_checkpoint()   — restore from JSONL (enables crash-resume)
      health()              — dict of substrate health info
    """

    @abstractmethod
    def fan_out(self, tasks: List[DispatchTask]) -> List[DispatchResult]:
        """Dispatch all tasks, return results in the same order."""
        ...

    @abstractmethod
    def export_checkpoint(self) -> str:
        """Return JSONL string of current in-flight + completed state."""
        ...

    @abstractmethod
    def import_checkpoint(self, jsonl: str) -> None:
        """Restore state from a JSONL checkpoint string."""
        ...

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Return substrate health (workers, brains available, queue depth)."""
        ...

    def fan_out_prompts(
        self,
        prompts: List[str],
        brain: str = "auto",
        tier: str = "medium",
        timeout: float = 90.0,
    ) -> List[DispatchResult]:
        """Convenience: fan out plain prompt strings."""
        tasks = [
            DispatchTask(id=f"t{i}", prompt=p, brain=brain, tier=tier, timeout=timeout)
            for i, p in enumerate(prompts)
        ]
        return self.fan_out(tasks)


# ---------------------------------------------------------------------------
# Checkpoint helpers
# ---------------------------------------------------------------------------

def checkpoint_to_file(dispatcher: Dispatcher, path: Path) -> None:
    """Write checkpoint JSONL to disk (durable, survives crash)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dispatcher.export_checkpoint())


def checkpoint_from_file(dispatcher: Dispatcher, path: Path) -> bool:
    """Load checkpoint if it exists. Returns True if loaded."""
    if path.exists():
        dispatcher.import_checkpoint(path.read_text())
        return True
    return False
