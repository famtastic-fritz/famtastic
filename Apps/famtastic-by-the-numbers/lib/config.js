import dotenv from 'dotenv';

dotenv.config();

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function formatUsdFromCents(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export const APP_CONFIG = {
  port: intEnv('PORT', 4173),
  supportEmail: process.env.PREMIUM_SUPPORT_EMAIL || 'hello@famtasticdesigns.com',
  premium: {
    productKey: process.env.PREMIUM_PRODUCT_KEY || 'by-the-numbers-premium-v1',
    productName: process.env.PREMIUM_PRODUCT_NAME || 'FAMtastic By the Numbers Premium Unlock',
    priceCents: intEnv('PREMIUM_PRICE_CENTS', 2200),
    currency: 'USD',
  },
  paypal: {
    env: process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox',
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    secret: process.env.PAYPAL_SECRET || '',
  },
  theme: {
    appName: 'FAMtastic By the Numbers',
    premiumHeadline: 'Unlock the deeper read',
    premiumSubhead: 'One-time activation. Durable unlock. Editable surfaces.',
    premiumCta: process.env.PREMIUM_CTA_LABEL || `Unlock premium for ${formatUsdFromCents(intEnv('PREMIUM_PRICE_CENTS', 2200))}`,
  },
};

export function publicRuntimeConfig() {
  return {
    appName: APP_CONFIG.theme.appName,
    supportEmail: APP_CONFIG.supportEmail,
    premium: {
      productKey: APP_CONFIG.premium.productKey,
      productName: APP_CONFIG.premium.productName,
      priceCents: APP_CONFIG.premium.priceCents,
      currency: APP_CONFIG.premium.currency,
      ctaLabel: APP_CONFIG.theme.premiumCta,
      headline: APP_CONFIG.theme.premiumHeadline,
      subhead: APP_CONFIG.theme.premiumSubhead,
    },
    paypalClientId: APP_CONFIG.paypal.clientId,
    paypalEnv: APP_CONFIG.paypal.env,
  };
}
