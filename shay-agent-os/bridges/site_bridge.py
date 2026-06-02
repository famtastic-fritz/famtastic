"""
bridges/site_bridge.py — Bridge to FAMtastic Site Studio.
"""

from __future__ import annotations

import logging
import subprocess
from typing import Any, Dict, Optional

from bridges.base_bridge import BaseBridge, BridgeResult

logger = logging.getLogger("bridges.site")


class SiteBridge(BaseBridge):
    """Bridge to fam-hub site commands."""

    def __init__(self):
        super().__init__("site")
        self._check_fam_hub()

    def _check_fam_hub(self) -> None:
        try:
            subprocess.run(["fam-hub", "--help"], capture_output=True, timeout=5)
            self.set_available(True)
        except Exception:
            logger.warning("fam-hub not available. SiteBridge will fail gracefully.")
            self.set_available(False)

    def validate_input(self, params: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        required = params.get("command")
        if not required:
            return False, "Missing 'command' parameter"
        valid_commands = {"build", "preview", "deploy", "init", "list"}
        if required not in valid_commands:
            return False, f"Invalid command '{required}'. Valid: {valid_commands}"
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
                error="fam-hub not available",
                bridge_name=self.name,
            )
            self._log_call("execute", params, result)
            return result

        command = params["command"]
        site_name = params.get("site_name", "")
        args = ["fam-hub", "site", command]
        if site_name:
            args.append(site_name)

        try:
            proc = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=params.get("timeout", 120),
            )
            if proc.returncode == 0:
                result = BridgeResult(
                    success=True,
                    data={"stdout": proc.stdout, "stderr": proc.stderr},
                    bridge_name=self.name,
                )
            else:
                result = BridgeResult(
                    success=False,
                    error=f"Exit code {proc.returncode}: {proc.stderr}",
                    data={"stdout": proc.stdout},
                    bridge_name=self.name,
                )
        except Exception as exc:
            result = BridgeResult(success=False, error=str(exc), bridge_name=self.name)

        self._log_call("execute", params, result)
        return result

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "available": self.is_available(),
            "log_count": len(self._log),
            "last_log": self._log[-1] if self._log else None,
        }
