'use strict';

/*
 * agents/lib/money.js — money-in helpers for the billing agent.
 *
 * Reads payment credentials from the Keychain vault and drives the `payments`
 * platform capability. There is intentionally NO money-out helper here:
 * refunds/payouts are human-gated by decision, so the agent layer cannot issue
 * them. Everything fails soft — no key means a manual-pending invoice, never a
 * crash and never a silent skip.
 */

const path = require('path');
const { execFileSync } = require('child_process');

const HUB = path.join(__dirname, '..', '..', '..');
const VAULT = path.join(HUB, 'platform', 'vault', 'vault.sh');
const INVOICE_SH = path.join(HUB, 'platform', 'capabilities', 'payments', 'invoice.sh');

function vaultRead(id) {
  try {
    return execFileSync(VAULT, ['read', id], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_) { return ''; }
}

function cashtag() {
  const t = vaultRead('payments/cashapp.cashtag');
  return t ? t.replace(/^\$/, '') : '';
}

function cashAppLink(amount) {
  const t = cashtag();
  return t ? `https://cash.app/$${t}/${amount}` : '';
}

// Returns { ok, hostedUrl, stripeInvoiceId } or { ok:false, reason }. Only attempts
// a real charge when ABOS_LIVE_BILLING=1 (so tests/dry-runs never hit Stripe).
function sendStripeInvoice(email, amount, description, termsDays) {
  if (process.env.ABOS_LIVE_BILLING !== '1') return { ok: false, reason: 'dry_run' };
  if (!vaultRead('payments/stripe.secret_key')) return { ok: false, reason: 'no_key' };
  try {
    const out = execFileSync(
      INVOICE_SH,
      [email, String(amount), description || 'Agent Business OS', String(termsDays)],
      { encoding: 'utf8' }
    );
    const url = (out.match(/^URL=(.+)$/m) || out.match(/https:\/\/\S+/) || [])[1] || (out.match(/https:\/\/\S+/) || [])[0] || '';
    const id = (out.match(/^INVOICE_ID=(.+)$/m) || [])[1] || '';
    return { ok: true, hostedUrl: url, stripeInvoiceId: id };
  } catch (err) {
    return { ok: false, reason: (err && err.message) || 'invoice_failed' };
  }
}

module.exports = { vaultRead, cashtag, cashAppLink, sendStripeInvoice };
