# End-to-End Pipeline — concept → cash

How a lead moves from first touch to collected payment, and which engine task
kind owns each stage. Every stage is a queue task the orchestrator runs at volume;
nothing here moves money or sends mail in the sandbox.

```
 ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌────────────────┐   ┌────────┐   ┌──────────┐
 │ MARKETING │ → │ CAMPAIGN │ → │ OUTREACH │ → │ DEAL DELIVERY  │ → │ SALES  │ → │ PAYMENT  │
 │ position  │   │ funnel   │   │ contact  │   │ deal_finder /  │   │ close  │   │ PayPal   │
 │           │   │ + cadence│   │ (draft)  │   │ apparel_finder │   │        │   │ invoice  │
 └───────────┘   └──────────┘   └──────────┘   └────────────────┘   └────────┘   └──────────┘
   handler:        handler:        handler:        handlers:            handler:     handler:
   marketing       campaign        outreach        deal_finder /        sales        payment
                                                   apparel_finder
```

## Stage detail

| # | Stage | Handler | Output artifact | Money/mail? |
|---|-------|---------|-----------------|-------------|
| 1 | Marketing positioning | `marketing` | `MARKETING-POSITIONING.md` | none |
| 2 | Campaign funnel | `campaign` | `CAMPAIGN-PLAN.md` | none |
| 3 | Outreach / contact | `outreach` | `OUTREACH-DRAFT.md` (DRAFT ONLY) | none — draft only |
| 4 | Deal delivery | `deal_finder` / `apparel_finder` | `CRUISE-*.md`, `APPAREL-*.md` | none |
| 5 | Sales close | `sales` | `SALES-CLOSE.md` | none |
| 6 | Payment collection | `payment` | `PAYMENT-PLAN.md` | invoice intent only, no capture |

## Safety gates (carried from the prior failed attempt)

1. **Outreach is never auto-sent.** The TravelJoy listing showed phone
   `407.600.4565`, visible email `ewilson1911@yahoo.com`, but a `mailto:` to
   `megamindzproductions@gmail.com`. A human verifies the recipient before any send.
2. **Payment is invoice-only.** With `PAYPAL_*` filled, the system can *create and
   send* a PayPal invoice; the customer pays by their own action. The engine never
   captures funds autonomously.
3. **Savings are estimates until verified** against live quotes (offline mode models
   levers, not live prices).

## How to run the whole pipeline

```bash
./bin/deal-engine seed --reset   # injects all six stages + the two headline deal hunts
./bin/deal-engine run            # orchestrator drives every stage to completion
ls business/                 # all stage artifacts
```
