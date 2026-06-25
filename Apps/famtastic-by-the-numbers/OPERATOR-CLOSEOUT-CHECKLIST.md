# FAMtastic By the Numbers — Operator Closeout Checklist

Status: web-proof complete
App path: `/Users/famtasticfritz/famtastic/apps/famtastic-by-the-numbers`

## Start the local closeout stack
1. `cd /Users/famtasticfritz/famtastic/apps/famtastic-by-the-numbers`
2. `brew services start mysql`
3. `npm run db:bootstrap-local`
4. `set -a && source ./.env && set +a && npm run migrate`
5. `set -a && source ./.env && set +a && npm run verify-db`
6. `npm run dev`
7. Open `http://127.0.0.1:4174`

## Proof commands that should already pass
- `curl -s http://127.0.0.1:4174/api/health`
- `set -a && source ./.env && set +a && npm run verify-db`
- `set -a && source ./.env && set +a && npm run verify-paypal-config`
- `POST /api/paypal/create-order` returns a live order id + approval URL without capture

## Expected proof truth
- `paymentMode` must be `live`
- `persistenceMode` must be `mysql`
- `premiumPriceCents` must be `100`
- support email must be `hello@famtasticdesigns.com`

## Verified closeout action bundle
1. Opened `http://127.0.0.1:4174`
2. Completed one real $1 PayPal purchase
3. Confirmed the return flow landed back in the app
4. Confirmed premium stayed restored after reload
5. Confirmed restore purchase still worked after the live unlock existed

## Done condition
Web proof is complete.