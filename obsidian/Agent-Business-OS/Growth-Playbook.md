---
title: Growth-Playbook
type: note
permalink: famtastic/agent-business-os/growth-playbook
---

# Agent Business OS — Growth Playbook (how people actually find it)

> The honest truth first: for a brand-new $2,500 done-for-you service with no
> audience and no budget, customers do **not** come from ads or SEO at the start
> — those are slow or cost money you don't have yet. The first 1–5 customers come
> from **targeted outreach + visible value in places your buyer already hangs
> out**, backed by **one piece of proof**. This playbook makes that a daily,
> mostly-done-for-you routine via the `growth-agent`.
> **Last updated:** 2026-06-02

## The buyer (be specific or nothing converts)

Founder-led **agencies, consultants, and local service businesses** doing roughly
$10k–$100k/mo who lose deals to **slow, manual follow-up**. The wedge isn't "AI" —
it's **"you're losing money every hour a lead waits."** Lead with the pain, not the tech.

## Channels, ranked for $0 budget (do them top-down)

1. **Warm network (highest conversion).** Anyone Fritz already knows who runs/serves
   a small business. Use the `referral` template. 5–10 intros > 500 cold emails.
2. **Communities where they gather — give value, don't pitch.** Post a concrete
   teardown, answer questions, become useful. DMs come to you. Specific places:
   - Reddit: r/agency, r/Entrepreneur, r/smallbusiness, r/marketing, r/digital_marketing, r/automation, r/freelance
   - Indie Hackers, relevant Slack/Discord/Skool groups, Facebook groups for agency owners
   - X/LinkedIn: reply to people complaining about lead/follow-up pain (search "losing leads", "follow up", "speed to lead")
3. **Targeted cold outreach (email/LinkedIn).** Build a list of small agencies
   (Clutch.co, Google Maps for local service, LinkedIn). Personalize with a real
   observation. The `growth-agent` renders the messages; you send them.
4. **Local/offline.** Chambers, BNI, local biz FB groups — strong for the
   service-business segment, low competition.
5. **SEO + content (compounding, slow).** Already seeded structured data on the
   site. Add teardown posts over time. This pays off in months, not days.
6. **Paid ads (only once an offer is proven to convert).** Don't burn cash
   validating with ads — validate by hand first.

## The proof problem (the real blocker)

Nobody buys a $2,500 service from a stranger with zero track record. Fix it fast:
**deliver the first one cheap or free in exchange for a result + a testimonial.**
One concrete case study ("cut response time from 9h → 5m, +18% close rate") makes
every later pitch 10× easier. Treat customer #1 as a marketing cost.

## The 14-day first-customer sprint (daily, ~60–90 min)

- **Day 1–2:** Build a 50-name prospect list (warm first, then communities/cold) →
  `agent-business-os/growth/prospects.json`. Write your one-line offer + pain hook.
- **Day 3–10:** Each morning run `node agents/run.js growth` → it hands you a
  worklist of personalized messages. Send them (you, from your accounts). Post one
  value teardown in a community. Reply to 3 people in pain. **Target: 15–25 touches/day.**
- **Day 7:** Offer customer #1 a discounted/free build for a testimonial.
- **Day 10–14:** Use the first result as proof in every message. Book calls. Close one.

## Where the agent fits

`growth-agent` is your demand co-pilot. It does NOT spam strangers automatically
(that burns your domain and is illegal). It:
- reads `growth/prospects.json`,
- hands you a **daily capped worklist** of ready-to-send, personalized copy
  (`node agents/run.js growth`),
- tracks touches so nobody's hit twice.

Run it daily (add to the launchd schedule or run by hand). Channel templates live
in `agents/growth-agent.js` (email / linkedin / x / reddit / referral).

## The one input only you can give

Two things no software can do for you, honestly:
1. **The prospect list** — who specifically to reach. Start with your warm network
   (names you already know). I can't invent real humans who want this.
2. **Actually sending / posting** — from your accounts (your LinkedIn, your email,
   your reputation). The agent writes the messages; you press send. Warm, human
   outreach converts; an automated cold-blast would torch your domain and trust.

Give me a rough idea of your warm network + which segment you can deliver best for,
and I'll tailor the offer, the hook, and the exact first 20 messages.

## What I automated vs. what's human

| Automated (done) | Human (yours) |
|---|---|
| Daily personalized worklist + copy | Pressing send / posting |
| Touch tracking, no-repeat, cap | Building the prospect list |
| Channel-specific templates | Delivering a great first result |
| Site SEO structured data | Showing up consistently for 14 days |