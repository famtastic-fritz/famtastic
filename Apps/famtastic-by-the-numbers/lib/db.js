import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { APP_CONFIG } from './config.js';

const HAS_MYSQL_ENV = ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'].every(key => Boolean(process.env[key]));
const DEV_STORE_PATH = path.resolve(process.cwd(), process.env.DEV_STORE_PATH || './data/dev-store.json');

function readRequired(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

let pool;

function getPool() {
  if (!HAS_MYSQL_ENV) {
    throw new Error('MySQL env not configured');
  }
  if (!pool) {
    pool = mysql.createPool({
      host: readRequired('MYSQL_HOST'),
      port: Number(process.env.MYSQL_PORT || 3306),
      database: readRequired('MYSQL_DATABASE'),
      user: readRequired('MYSQL_USER'),
      password: readRequired('MYSQL_PASSWORD'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+00:00',
    });
  }
  return pool;
}

async function ensureDevStore() {
  await fs.mkdir(path.dirname(DEV_STORE_PATH), { recursive: true });
  try {
    await fs.access(DEV_STORE_PATH);
  } catch {
    await fs.writeFile(DEV_STORE_PATH, JSON.stringify({ checkoutSessions: [], purchases: [], unlocks: [] }, null, 2));
  }
}

async function readDevStore() {
  await ensureDevStore();
  return JSON.parse(await fs.readFile(DEV_STORE_PATH, 'utf8'));
}

async function writeDevStore(store) {
  await ensureDevStore();
  await fs.writeFile(DEV_STORE_PATH, JSON.stringify(store, null, 2));
}

export function getPersistenceMode() {
  return HAS_MYSQL_ENV ? 'mysql' : 'dev-json';
}

export async function query(sql, params = []) {
  const conn = await getPool().getConnection();
  try {
    return await conn.execute(sql, params);
  } finally {
    conn.release();
  }
}

export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function saveCheckoutSession({ paypalOrderId, email, chartInput, subtotalCents }) {
  if (!HAS_MYSQL_ENV) {
    const store = await readDevStore();
    const existingIndex = store.checkoutSessions.findIndex(item => item.paypal_order_id === paypalOrderId);
    const record = {
      paypal_order_id: paypalOrderId,
      email,
      product_key: APP_CONFIG.premium.productKey,
      subtotal_cents: subtotalCents,
      chart_input_json: chartInput,
      status: 'pending',
      updated_at: new Date().toISOString(),
    };
    if (existingIndex >= 0) store.checkoutSessions[existingIndex] = { ...store.checkoutSessions[existingIndex], ...record };
    else store.checkoutSessions.push({ id: store.checkoutSessions.length + 1, created_at: new Date().toISOString(), ...record });
    await writeDevStore(store);
    return;
  }

  await query(
    `INSERT INTO premium_checkout_sessions
       (paypal_order_id, email, product_key, subtotal_cents, chart_input_json, status)
     VALUES (?, ?, ?, ?, ?, 'pending')
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       product_key = VALUES(product_key),
       subtotal_cents = VALUES(subtotal_cents),
       chart_input_json = VALUES(chart_input_json),
       status = 'pending'`,
    [paypalOrderId, email, APP_CONFIG.premium.productKey, subtotalCents, JSON.stringify(chartInput)],
  );
}

export async function getPendingCheckoutSession(paypalOrderId) {
  if (!HAS_MYSQL_ENV) {
    const store = await readDevStore();
    return store.checkoutSessions.find(item => item.paypal_order_id === paypalOrderId && item.status === 'pending') || null;
  }

  const [rows] = await query(
    `SELECT * FROM premium_checkout_sessions
      WHERE paypal_order_id = ? AND status = 'pending'
      LIMIT 1`,
    [paypalOrderId],
  );
  return rows[0] || null;
}

export async function getActiveUnlockByEmail(email) {
  if (!HAS_MYSQL_ENV) {
    const store = await readDevStore();
    const unlock = [...store.unlocks].reverse().find(item => item.email === email && item.product_key === APP_CONFIG.premium.productKey && item.active === 1);
    if (!unlock) return null;
    const purchase = store.purchases.find(item => item.id === unlock.purchase_id);
    return { ...unlock, paypal_order_id: purchase?.paypal_order_id || null, amount_cents: purchase?.amount_cents || null, currency: purchase?.currency || null, purchase_status: purchase?.status || null };
  }

  const [rows] = await query(
    `SELECT pu.*, pp.paypal_order_id, pp.amount_cents, pp.currency, pp.status AS purchase_status
       FROM premium_unlocks pu
       JOIN premium_purchases pp ON pp.id = pu.purchase_id
      WHERE pu.email = ?
        AND pu.product_key = ?
        AND pu.active = 1
      ORDER BY pu.id DESC
      LIMIT 1`,
    [email, APP_CONFIG.premium.productKey],
  );
  return rows[0] || null;
}

export async function recordSuccessfulPurchase({ paypalOrderId, payerEmail, amountCents, currency, capturePayload }) {
  if (!HAS_MYSQL_ENV) {
    const store = await readDevStore();
    const checkout = store.checkoutSessions.find(item => item.paypal_order_id === paypalOrderId && item.status === 'pending');
    if (!checkout) throw new Error('Checkout session not found or already consumed');
    if (Math.abs(Number(checkout.subtotal_cents) - Number(amountCents)) > 1) throw new Error('Payment amount mismatch');
    const resolvedEmail = String(payerEmail || checkout.email || '').trim().toLowerCase();
    if (!resolvedEmail) throw new Error('Payer email missing');

    let purchase = store.purchases.find(item => item.paypal_order_id === paypalOrderId);
    if (!purchase) {
      purchase = {
        id: store.purchases.length + 1,
        paypal_order_id: paypalOrderId,
        email: resolvedEmail,
        product_key: APP_CONFIG.premium.productKey,
        amount_cents: amountCents,
        currency,
        status: 'completed',
        capture_payload_json: capturePayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.purchases.push(purchase);
    } else {
      Object.assign(purchase, {
        email: resolvedEmail,
        amount_cents: amountCents,
        currency,
        status: 'completed',
        capture_payload_json: capturePayload,
        updated_at: new Date().toISOString(),
      });
    }

    let unlock = store.unlocks.find(item => item.email === resolvedEmail && item.product_key === APP_CONFIG.premium.productKey);
    if (!unlock) {
      unlock = {
        id: store.unlocks.length + 1,
        email: resolvedEmail,
        product_key: APP_CONFIG.premium.productKey,
        purchase_id: purchase.id,
        active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.unlocks.push(unlock);
    } else {
      Object.assign(unlock, { purchase_id: purchase.id, active: 1, updated_at: new Date().toISOString() });
    }

    checkout.status = 'captured';
    checkout.email = resolvedEmail;
    checkout.updated_at = new Date().toISOString();
    await writeDevStore(store);
    return { ...unlock, paypal_order_id: purchase.paypal_order_id, amount_cents: purchase.amount_cents, currency: purchase.currency, purchase_status: purchase.status };
  }

  return withTransaction(async (conn) => {
    const [sessionRows] = await conn.execute(
      `SELECT * FROM premium_checkout_sessions
        WHERE paypal_order_id = ? AND status = 'pending'
        LIMIT 1`,
      [paypalOrderId],
    );
    const checkout = sessionRows[0];
    if (!checkout) {
      throw new Error('Checkout session not found or already consumed');
    }
    if (Math.abs(Number(checkout.subtotal_cents) - Number(amountCents)) > 1) {
      throw new Error('Payment amount mismatch');
    }

    const resolvedEmail = String(payerEmail || checkout.email || '').trim().toLowerCase();
    if (!resolvedEmail) {
      throw new Error('Payer email missing');
    }

    const [purchaseResult] = await conn.execute(
      `INSERT INTO premium_purchases
         (paypal_order_id, email, product_key, amount_cents, currency, status, capture_payload_json)
       VALUES (?, ?, ?, ?, ?, 'completed', ?)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         amount_cents = VALUES(amount_cents),
         currency = VALUES(currency),
         status = 'completed',
         capture_payload_json = VALUES(capture_payload_json),
         updated_at = CURRENT_TIMESTAMP`,
      [paypalOrderId, resolvedEmail, APP_CONFIG.premium.productKey, amountCents, currency, JSON.stringify(capturePayload)],
    );

    const purchaseId = purchaseResult.insertId || (await conn.execute(
      'SELECT id FROM premium_purchases WHERE paypal_order_id = ? LIMIT 1',
      [paypalOrderId],
    ))[0][0]?.id;

    await conn.execute(
      `INSERT INTO premium_unlocks
         (email, product_key, purchase_id, active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         purchase_id = VALUES(purchase_id),
         active = 1,
         updated_at = CURRENT_TIMESTAMP`,
      [resolvedEmail, APP_CONFIG.premium.productKey, purchaseId],
    );

    await conn.execute(
      `UPDATE premium_checkout_sessions
          SET status = 'captured',
              email = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE paypal_order_id = ?`,
      [resolvedEmail, paypalOrderId],
    );

    const [unlockRows] = await conn.execute(
      `SELECT pu.*, pp.paypal_order_id, pp.amount_cents, pp.currency
         FROM premium_unlocks pu
         JOIN premium_purchases pp ON pp.id = pu.purchase_id
        WHERE pu.email = ? AND pu.product_key = ?
        ORDER BY pu.id DESC
        LIMIT 1`,
      [resolvedEmail, APP_CONFIG.premium.productKey],
    );

    return unlockRows[0] || null;
  });
}
