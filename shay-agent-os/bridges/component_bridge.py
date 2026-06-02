"""
bridges/component_bridge.py — Bridge to Component Studio.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

from bridges.base_bridge import BaseBridge, BridgeResult

logger = logging.getLogger("bridges.component")


class ComponentBridge(BaseBridge):
    """Bridge to FAMtastic Component Studio."""

    def __init__(self):
        super().__init__("component")
        self._check_studio()

    def _check_studio(self) -> None:
        # Check for component studio CLI or directory
        studio_path = os.path.expanduser("~/famtastic/component-studio")
        available = os.path.isdir(studio_path)
        self.set_available(available)
        if not available:
            logger.warning("Component Studio not found. ComponentBridge will fail gracefully.")

    def validate_input(self, params: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        command = params.get("command")
        if not command:
            return False, "Missing 'command' parameter"
        valid = {"generate", "list", "get", "update", "delete"}
        if command not in valid:
            return False, f"Invalid command '{command}'. Valid: {valid}"
        if command in {"generate", "update"} and not params.get("spec"):
            return False, "Missing 'spec' parameter for generate/update"
        return True, None

    def execute(self, params: Dict[str, Any]) -> BridgeResult:
        ok, err = self.validate_input(params)
        if not ok:
            result = BridgeResult(success=False, error=err, bridge_name=self.name)
            self._log_call("execute", params, result)
            return result

        if not self.is_available():
            result = BridgeResult(
                success=False,
                error="Component Studio not available",
                bridge_name=self.name,
            )
            self._log_call("execute", params, result)
            return result

        command = params["command"]
        spec = params.get("spec", {})
        logger.info(f"[{self.name}] Would execute {command} with spec: {spec}")

        result = BridgeResult(
            success=True,
            data={
                "command": command,
                "spec": spec,
                "status": "queued",
                "note": "Stub execution — Component Studio not fully integrated",
            },
            bridge_name=self.name,
        )
        self._log_call("execute", params, result)
        return result

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "available": self.is_available(),
            "log_count": len(self._log),
            "last_log": self._log[-1] if self._log else None,
        }
