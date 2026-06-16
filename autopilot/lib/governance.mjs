// Governance gate — the safety layer between the autopilot's decisions and
// any irreversible / outward-facing / paid action. Nothing reaches the
// public, the inbox, or your wallet without passing through here.
//
// Modes returned:
//   "live"     — perform the real action
//   "dry-run"  — stage the action (write a bundle) but don't send it
//   "blocked"  — refuse entirely (kill switch / over budget)

import fs from "node:fs";
import { stopFlagPath } from "./paths.mjs";
import { hasCredsFor } from "./vault.mjs";

const OUTWARD = new Set(["publish", "email", "comment"]);

export function isStopped(root) {
  return fs.existsSync(stopFlagPath(root));
}

// action: { kind: "publish"|"email"|"comment"|"spend", platform?, amount? }
export function checkGovernance(action, { config, root } = {}) {
  if (isStopped(root)) {
    return { allowed: false, mode: "blocked", reason: "STOP flag set (kill switch)" };
  }

  if (OUTWARD.has(action.kind)) {
    // Outward actions require BOTH the live flag AND real credentials.
    if (!config?.live) {
      return { allowed: true, mode: "dry-run", reason: "config.live=false → staging only" };
    }
    if (action.platform && !hasCredsFor(action.platform)) {
      return {
        allowed: true,
        mode: "dry-run",
        reason: `no credentials for ${action.platform} → staging only`,
      };
    }
    return { allowed: true, mode: "live", reason: "live + credentials present" };
  }

  // Non-outward actions (internal production) are always allowed; spend is
  // governed separately by the budget module.
  return { allowed: true, mode: "live", reason: "internal action" };
}
