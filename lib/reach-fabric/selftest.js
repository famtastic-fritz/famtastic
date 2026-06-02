// selftest.js — proves the fabric delivers with zero creds and audits the send.
//
// Runs sendReach() in a clean env (all channel secrets stripped), asserts it
// falls back to `console`, and asserts a JSONL audit line was appended to
// platform/invocations/<date>.jsonl. Exits non-zero on any failed assertion.
'use strict';

const fs = require('fs');
const path = require('path');

// Strip every channel credential so only the console adapter is available.
for (const v of [
  'RESEND_API_KEY', 'REACH_EMAIL_TO', 'REACH_EMAIL_FROM', 'REACH_EMAIL_REPLY_TO',
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'REACH_SMS_TO',
  'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'REACH_PUSH_SUBSCRIPTION',
]) {
  delete process.env[v];
}

const { sendReach, INVOCATIONS_DIR } = require('./index');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
  }
  console.log(`ok: ${msg}`);
}

(async () => {
  const auditFile = path.join(
    INVOCATIONS_DIR,
    `${new Date().toISOString().slice(0, 10)}.jsonl`
  );
  const before = fs.existsSync(auditFile) ? fs.readFileSync(auditFile, 'utf8').length : 0;

  const marker = `selftest-${Date.now()}`;
  const result = await sendReach({
    message: `Reach Fabric selftest ${marker}`,
    title: 'Selftest',
    urgency: 'critical',
  });

  assert(result.delivered_via === 'console', 'falls back to console with no creds');
  assert(result.fellback === true, 'reports fellback=true (console was not first choice)');
  assert(result.audit_written === true, 'audit_written flag is true');
  assert(
    result.attempts.some((a) => a.channel === 'console' && a.status === 'delivered'),
    'console attempt is recorded as delivered'
  );
  assert(
    result.attempts.some((a) => a.status === 'skipped'),
    'higher-priority channels recorded as skipped (no creds)'
  );

  const after = fs.readFileSync(auditFile, 'utf8');
  assert(after.length > before, 'audit file grew (a line was appended)');
  const lastLine = after.trim().split('\n').pop();
  const parsed = JSON.parse(lastLine);
  assert(parsed.capability === 'reach.send', 'audit line capability is reach.send');
  assert(parsed.delivered_via === 'console', 'audit line records delivered_via=console');

  console.log('\nALL SELFTEST ASSERTIONS PASSED');
  console.log(`audit line -> ${auditFile}`);
})().catch(() => {
  process.exitCode = process.exitCode || 1;
});
