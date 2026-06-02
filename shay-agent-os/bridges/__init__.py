"""
bridges/__init__.py — Bridge registry.
"""

from __future__ import annotations

from bridges.base_bridge import BaseBridge, BridgeResult
from bridges.site_bridge import SiteBridge
from bridges.media_bridge import MediaBridge
from bridges.component_bridge import ComponentBridge

__all__ = ["BaseBridge", "BridgeResult", "SiteBridge", "MediaBridge", "ComponentBridge"]


class BridgeRegistry:
    """Registry of all available bridges."""

    def __init__(self):
        self._bridges: dict[str, BaseBridge] = {
            "site": SiteBridge(),
            "media": MediaBridge(),
            "component": ComponentBridge(),
        }

    def get(self, name: str) -> BaseBridge | None:
        return self._bridges.get(name)

    def list(self) -> dict[str, dict]:
        return {name: bridge.get_status() for name, bridge in self._bridges.items()}

    def execute(self, name: str, params: dict) -> BridgeResult:
        bridge = self.get(name)
        if bridge is None:
            return BridgeResult(success=False, error=f"Unknown bridge: {name}")
        return bridge.execute(params)


# Global registry instance
registry = BridgeRegistry()
