"""
bridges/base_bridge.py — Shared interface for all studio bridges.
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

logger = logging.getLogger("bridges.base")


class BridgeResult:
    """Result of a bridge execution."""

    def __init__(
        self,
        success: bool,
        data: Any = None,
        error: Optional[str] = None,
        bridge_name: str = "",
    ):
        self.success = success
        self.data = data
        self.error = error
        self.bridge_name = bridge_name
        self.timestamp = time.time()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "bridge": self.bridge_name,
            "timestamp": self.timestamp,
        }


class BaseBridge(ABC):
    """Abstract base for all FAMtastic studio bridges."""

    def __init__(self, name: str):
        self.name = name
        self._log: list[Dict[str, Any]] = []
        self._available = True

    @abstractmethod
    def validate_input(self, params: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Validate input parameters. Returns (ok, error_message)."""
        ...

    @abstractmethod
    def execute(self, params: Dict[str, Any]) -> BridgeResult:
        """Execute the bridge operation."""
        ...

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Return current bridge status."""
        ...

    def _log_call(self, action: str, params: Dict[str, Any], result: BridgeResult) -> None:
        entry = {
            "timestamp": time.time(),
            "action": action,
            "params": params,
            "result": result.to_dict(),
        }
        self._log.append(entry)
        if len(self._log) > 1000:
            self._log = self._log[-1000:]
        logger.info(f"[{self.name}] {action}: success={result.success}")

    def get_log(self, limit: int = 50) -> list[Dict[str, Any]]:
        return self._log[-limit:]

    def set_available(self, available: bool) -> None:
        self._available = available

    def is_available(self) -> bool:
        return self._available
