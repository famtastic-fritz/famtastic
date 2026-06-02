"""
bridges/media_bridge.py — Bridge to media generation tools.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

from bridges.base_bridge import BaseBridge, BridgeResult

logger = logging.getLogger("bridges.media")

MEDIA_TOOLS = {
    "image_gen": "image_generate",
    "video_gen": "video_generate",
    "audio_gen": "audio_generate",
    "tts": "text_to_speech",
}


class MediaBridge(BaseBridge):
    """Bridge to FAMtastic media generation tools."""

    def __init__(self):
        super().__init__("media")
        self._check_tools()

    def _check_tools(self) -> None:
        # Check if muapi or other media tools are available
        # For now, mark as available if we can find expected scripts
        available = False
        for tool in ["muapi", "image_generate", "fal"]:
            if os.system(f"which {tool} >/dev/null 2>&1") == 0:
                available = True
                break
        self.set_available(available)
        if not available:
            logger.warning("Media tools not found. MediaBridge will fail gracefully.")

    def validate_input(self, params: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        media_type = params.get("type")
        if not media_type:
            return False, "Missing 'type' parameter"
        if media_type not in MEDIA_TOOLS:
            return False, f"Invalid type '{media_type}'. Valid: {set(MEDIA_TOOLS.keys())}"
        if not params.get("prompt"):
            return False, "Missing 'prompt' parameter"
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
                error="Media generation tools not available",
                bridge_name=self.name,
            )
            self._log_call("execute", params, result)
            return result

        # Stub: in production this would call the actual media tool
        media_type = params["type"]
        prompt = params["prompt"]
        logger.info(f"[{self.name}] Would generate {media_type} for: {prompt[:80]}")

        result = BridgeResult(
            success=True,
            data={
                "type": media_type,
                "prompt": prompt,
                "status": "queued",
                "note": "Stub execution — media tools not fully integrated",
            },
            bridge_name=self.name,
        )
        self._log_call("execute", params, result)
        return result

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "available": self.is_available(),
            "supported_types": list(MEDIA_TOOLS.keys()),
            "log_count": len(self._log),
            "last_log": self._log[-1] if self._log else None,
        }
