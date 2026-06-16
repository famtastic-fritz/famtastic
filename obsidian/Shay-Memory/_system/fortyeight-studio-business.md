---
title: FortyEight Studio — Business & Payment Record (shared brain)
type: system
tags:
- business
- payment
- fortyeight-studio
- faceless
- agent-shared
updated: 2026-06-02
permalink: shay-memory/system/fortyeight-studio-business
---

# FortyEight Studio — canonical business record

> **For all agents (Claude Code, Codex, Gemini, swarm):** this is the single source
> of truth for FortyEight Studio's brand + payment info. Machine-readable mirror:
> `~/.shay/business-config.json`. Read here before inserting payment links or brand
> details into any asset.

## Business
- **Name:** FortyEight Studio (faceless / white-label local web-design studio)
- **Offer:** custom website, **live in 48 hours, flat $497**, client owns it, no monthly fees
- **Deposit terms:** $297 to start, $200 on delivery
- **Storefront:** https://fortyeight-studio.netlify.app
- **Netlify account slug:** `fritz-medine` · **site naming:** `f8-<clientslug>`

## Payment  ✅ ACTIVE
- **Cash App $cashtag:** `$FAMtasticFritz`
- **Deposit link ($297):** `https://cash.app/$FAMtasticFritz/297`
- **Profile link:** `https://cash.app/$FAMtasticFritz`
- Note: tag contains Fritz's name (not fully faceless). To make faceless, rename
  the cashtag in Cash App (e.g. `$FortyEightStudio`) and update here + storefront.
- Recommended: use a **Cash App Business** account so the pay screen shows
  "FortyEight Studio", not Fritz's legal name (keeps it faceless).
- A cashtag is **receive-only** (safe to store/share — it only lets people send
  money in). **Never** store PINs, passwords, cards, bank/routing, or logins here.

## Facelessness rules (hard)
- No personal name, personal email, or phone on any public FortyEight Studio asset.
- Lead intake via **Web3Forms** (public HTML shows only a UUID access key).

## How agents should use this
- Inserting a "pay deposit" button/link → use `payment.cashapp_deposit_link` from
  the JSON once populated; do not guess or fabricate a cashtag.
- Quoting price/offer → use the values above verbatim.
- Building/deploying a client site → `f8-<clientslug>` on Netlify, deploy by UUID.

Related: storefront source at `~/Desktop/FRITZ-PORTFOLIO/`, strategy at
`~/Desktop/GO-TODAY-STRATEGY.md`.