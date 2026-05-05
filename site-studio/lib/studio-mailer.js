// studio-mailer.js - Site Studio-owned transactional email via Resend.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(os.homedir(), '.config', 'famtastic', 'studio-config.json');
const VAULT = path.join(REPO_ROOT, 'platform', 'vault', 'vault.sh');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readStudioConfig() {
  return readJson(CONFIG_PATH);
}

function vaultIdFromRef(ref) {
  if (!ref || typeof ref !== 'string') return ref;
  return ref.startsWith('vault://') ? ref.slice('vault://'.length) : ref;
}

function readVault(ref) {
  const id = vaultIdFromRef(ref);
  return execFileSync(VAULT, ['read', id], { encoding: 'utf8' }).trim();
}

function quoteDisplayName(name) {
  return String(name || 'FAMtastic Site Studio').replace(/["\\]/g, '\\$&');
}

function getStudioEmailConfig(config = readStudioConfig()) {
  const email = config.notifications && config.notifications.email;
  if (!email || email.provider !== 'resend' || !email.enabled) {
    throw new Error('Studio Resend email is not configured. Run: fam-hub platform configure-resend');
  }
  for (const key of ['api_key_ref', 'from_name', 'from_email']) {
    if (!email[key]) throw new Error(`Studio Resend email missing config key: ${key}`);
  }
  return email;
}

async function sendStudioEmail({ to, subject, html, text, tags = [] }) {
  if (!to) throw new Error('sendStudioEmail requires a recipient');
  if (!subject) throw new Error('sendStudioEmail requires a subject');
  if (!html && !text) throw new Error('sendStudioEmail requires html or text');

  const config = readStudioConfig();
  const email = getStudioEmailConfig(config);
  const apiKey = readVault(email.api_key_ref);
  const from = `${quoteDisplayName(email.from_name)} <${email.from_email}>`;
  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || undefined,
    text: text || undefined,
  };
  if (email.reply_to) payload.reply_to = email.reply_to;
  if (tags.length) payload.tags = tags;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Resend HTTP ${response.status}: ${body}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    return { raw: body };
  }
}

module.exports = {
  CONFIG_PATH,
  getStudioEmailConfig,
  readStudioConfig,
  sendStudioEmail,
};
