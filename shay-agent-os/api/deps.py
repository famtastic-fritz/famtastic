"""
api/deps.py — shared orchestrator accessor for the command-center API.

Lives in its own module (not api.server) so the route modules
(api.routes.agents/tasks/events/trust) can import ``get_orchestrator`` WITHOUT
importing ``api.server``. The old layout had server.py import the routes while
the routes imported ``get_orchestrator`` back from server.py — a cycle that,
under ``python -m api.server``, re-entered server.py mid-initialisation and
raised "partially initialized module ... has no attribute 'router'". Putting the
accessor here breaks that cycle structurally: server.py and every route import
from this leaf module, which imports neither.
"""

from __future__ import annotations

import logging
import os
import sys
from typing import Optional

# Ensure components/swarm is importable (mirrors server.py's path insert) so this
# module stands alone regardless of who imports it first.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from components.swarm import SwarmOrchestrator

logger = logging.getLogger("api.deps")

# Single process-wide orchestrator instance.
_orch: Optional[SwarmOrchestrator] = None


def get_orchestrator() -> SwarmOrchestrator:
    """Return the running SwarmOrchestrator, starting it on first use."""
    global _orch
    if _orch is None:
        _orch = SwarmOrchestrator(num_workers=3, log_level="INFO")
        _orch.start()
        logger.info("SwarmOrchestrator started via API server")
    return _orch


def stop_orchestrator() -> None:
    """Stop the orchestrator if it was started (idempotent)."""
    global _orch
    if _orch is not None:
        _orch.stop()
        logger.info("SwarmOrchestrator stopped")
        _orch = None
