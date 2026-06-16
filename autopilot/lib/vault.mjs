// Credential lookup. Reads from environment first, then the FAMtastic vault
// (platform/vault — Linux backing store at ~/.config/famtastic/vault.d/).
// This is the ONLY place the human plugs in: once these resolve, the
// publishing stages flip from dry-run to live with no code change.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const VAULT_DIR = path.join(os.homedir(), ".config", "famtastic", "vault.d");

// platform -> { env: [...accepted env vars], vault: "vault/secret/id" }
export const CRED_MAP = {
  youtube: { env: ["YOUTUBE_TOKEN", "YT_ACCESS_TOKEN"], vault: "autopilot.youtube.oauth_token" },
  tiktok: { env: ["TIKTOK_TOKEN", "TIKTOK_ACCESS_TOKEN"], vault: "autopilot.tiktok.access_token" },
  instagram: { env: ["IG_TOKEN", "INSTAGRAM_ACCESS_TOKEN"], vault: "autopilot.instagram.access_token" },
  openai: { env: ["OPENAI_API_KEY"], vault: "studio.openai.api_key" },
  elevenlabs: { env: ["ELEVENLABS_API_KEY"], vault: "studio.elevenlabs.api_key" },
};

export function readSecret(id) {
  const def = CRED_MAP[id];
  if (def) {
    for (const e of def.env) {
      if (process.env[e]) return process.env[e];
    }
  }
  // Vault file: id with dots/slashes mapped to a flat filename.
  const candidates = [
    def?.vault && path.join(VAULT_DIR, def.vault),
    def?.vault && path.join(VAULT_DIR, def.vault.replace(/[/.]/g, "_")),
    path.join(VAULT_DIR, String(id).replace(/[/.]/g, "_")),
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return fs.readFileSync(c, "utf8").trim();
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function hasCredsFor(platform) {
  return !!readSecret(platform);
}
