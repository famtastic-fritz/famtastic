"""
trust_mode.py — Configurable autonomy levels.

Levels:
  - paranoid:   Ask always
  - cautious:   Ask for deploy / money / destructive ops
  - trusted:    Auto under $X
  - godmode:    Do everything, notify after

Config file at ~/.shay/trust-mode.json
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("swarm.trust_mode")

CONFIG_DIR = Path.home() / ".shay"
CONFIG_PATH = CONFIG_DIR / "trust-mode.json"


class TrustLevel(Enum):
    PARANOID = "paranoid"
    CAUTIOUS = "cautious"
    TRUSTED = "trusted"
    GODMODE = "godmode"


# Keywords that trigger approval in cautious mode
CAUTIOUS_TRIGGERS = [
    "deploy", "production", "money", "payment", "purchase", "buy",
    "delete", "remove", "drop", "destroy", "rm -rf", "sudo",
    "api key", "secret", "password", "token", "credential",
    "transfer", "send", "withdraw", "charge", "billing",
    "docker push", "git push", "publish", "release",
]

# Keywords that trigger approval in trusted mode (higher threshold)
TRUSTED_TRIGGERS = [
    "deploy", "production", "money", "payment", "purchase", "buy",
    "transfer", "send", "withdraw", "charge", "billing",
    "sudo", "rm -rf", "destroy",
]


@dataclass
class TrustConfig:
    level: str = "cautious"
    auto_budget_usd: float = 10.0
    notify_after: bool = True
    slack_webhook: Optional[str] = None
    email: Optional[str] = None
    allowed_commands: List[str] = field(default_factory=list)
    blocked_commands: List[str] = field(default_factory=list)
    history: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TrustConfig":
        # Filter to known fields
        known = {f for f in cls.__dataclass_fields__}
        filtered = {k: v for k, v in data.items() if k in known}
        return cls(**filtered)


class TrustMode:
    """
    Gatekeeper for autonomous actions.
    """

    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or CONFIG_PATH
        self.config = self._load_or_create()

    def _load_or_create(self) -> TrustConfig:
        """Load config from disk or create default."""
        if self.config_path.exists():
            try:
                with open(self.config_path, "r") as f:
                    data = json.load(f)
                cfg = TrustConfig.from_dict(data)
                logger.info(f"Loaded trust config from {self.config_path} (level={cfg.level})")
                return cfg
            except Exception as exc:
                logger.error(f"Failed to load trust config: {exc}. Using default.")
        # Create default
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        cfg = TrustConfig()
        self._save(cfg)
        logger.info(f"Created default trust config at {self.config_path}")
        return cfg

    def _save(self, cfg: TrustConfig) -> None:
        try:
            with open(self.config_path, "w") as f:
                json.dump(cfg.to_dict(), f, indent=2, default=str)
        except Exception as exc:
            logger.error(f"Failed to save trust config: {exc}")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def set_level(self, level: str) -> None:
        """Change trust level."""
        if level not in {e.value for e in TrustLevel}:
            raise ValueError(f"Invalid trust level: {level}. Choose from: {[e.value for e in TrustLevel]}")
        self.config.level = level
        self._save(self.config)
        logger.info(f"Trust level changed to {level}")

    def get_level(self) -> str:
        return self.config.level

    def check(
        self,
        action: str,
        estimated_cost_usd: float = 0.0,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Check if an action is allowed under current trust level.
        Returns dict with:
          - allowed: bool
          - reason: str
          - needs_approval: bool
          - escalation: Optional[str]
        """
        level = TrustLevel(self.config.level)
        action_lower = action.lower()
        ctx = context or {}

        # Always check blocked commands
        for blocked in self.config.blocked_commands:
            if blocked.lower() in action_lower:
                return {
                    "allowed": False,
                    "reason": f"Action matches blocked command: {blocked}",
                    "needs_approval": True,
                    "escalation": "blocked_by_policy",
                }

        # PARANOID: always ask
        if level == TrustLevel.PARANOID:
            return {
                "allowed": False,
                "reason": "Paranoid mode: all actions require approval",
                "needs_approval": True,
                "escalation": None,
            }

        # GODMODE: allow everything, notify after
        if level == TrustLevel.GODMODE:
            self._log_decision(action, True, "godmode")
            return {
                "allowed": True,
                "reason": "Godmode: auto-approved",
                "needs_approval": False,
                "escalation": None,
            }

        # TRUSTED: auto under budget, check triggers
        if level == TrustLevel.TRUSTED:
            if estimated_cost_usd > self.config.auto_budget_usd:
                return {
                    "allowed": False,
                    "reason": f"Estimated cost ${estimated_cost_usd} exceeds auto-budget ${self.config.auto_budget_usd}",
                    "needs_approval": True,
                    "escalation": "budget_exceeded",
                }
            for trigger in TRUSTED_TRIGGERS:
                if trigger in action_lower:
                    return {
                        "allowed": False,
                        "reason": f"Trusted mode: trigger word '{trigger}' requires approval",
                        "needs_approval": True,
                        "escalation": None,
                    }
            self._log_decision(action, True, "trusted_auto")
            return {
                "allowed": True,
                "reason": "Trusted mode: auto-approved",
                "needs_approval": False,
                "escalation": None,
            }

        # CAUTIOUS: ask for deploy/money/destructive
        if level == TrustLevel.CAUTIOUS:
            for trigger in CAUTIOUS_TRIGGERS:
                if trigger in action_lower:
                    return {
                        "allowed": False,
                        "reason": f"Cautious mode: trigger word '{trigger}' requires approval",
                        "needs_approval": True,
                        "escalation": None,
                    }
            self._log_decision(action, True, "cautious_auto")
            return {
                "allowed": True,
                "reason": "Cautious mode: no triggers detected, auto-approved",
                "needs_approval": False,
                "escalation": None,
            }

        # Fallback
        return {
            "allowed": False,
            "reason": "Unknown trust level state",
            "needs_approval": True,
            "escalation": "unknown_state",
        }

    def approve(self, action: str, approver: str = "user", note: str = "") -> Dict[str, Any]:
        """Log an approval."""
        self._log_decision(action, True, f"approved_by_{approver}", note=note)
        return {"allowed": True, "reason": f"Approved by {approver}", "needs_approval": False}

    def deny(self, action: str, denier: str = "user", note: str = "") -> Dict[str, Any]:
        """Log a denial."""
        self._log_decision(action, False, f"denied_by_{denier}", note=note)
        return {"allowed": False, "reason": f"Denied by {denier}", "needs_approval": True}

    def _log_decision(
        self,
        action: str,
        allowed: bool,
        decision_type: str,
        note: str = "",
    ) -> None:
        entry = {
            "timestamp": time.time(),
            "action": action,
            "allowed": allowed,
            "type": decision_type,
            "note": note,
        }
        self.config.history.append(entry)
        # Trim history to last 1000 entries
        if len(self.config.history) > 1000:
            self.config.history = self.config.history[-1000:]
        self._save(self.config)
        logger.info(f"Trust decision: {decision_type} action='{action[:80]}' allowed={allowed}")

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.config.history[-limit:]

    def add_blocked_command(self, cmd: str) -> None:
        if cmd not in self.config.blocked_commands:
            self.config.blocked_commands.append(cmd)
            self._save(self.config)

    def add_allowed_command(self, cmd: str) -> None:
        if cmd not in self.config.allowed_commands:
            self.config.allowed_commands.append(cmd)
            self._save(self.config)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.config.level,
            "auto_budget_usd": self.config.auto_budget_usd,
            "notify_after": self.config.notify_after,
            "allowed_commands": self.config.allowed_commands,
            "blocked_commands": self.config.blocked_commands,
            "history_count": len(self.config.history),
        }
