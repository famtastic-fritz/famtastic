# MBSH Chatbot Phase 1 Verification — 2026-05-04

## Verdict

**Phase 1 frontend behavior passes with runtime blockers.** The Hi-Tide Harry chatbot widget exists across the v2 frontend pages, opens in a real browser after a CSS fix, answers all eight V1 FAQ prompts from the local FAQ table, and routes unknown questions to the fallback collector payload. Backend persistence and committee email notification remain blocked until the MBSH PHP runtime has database, Resend, CORS, and production API config.

## Browser Proof

Proof file: `proofs/mbsh-chatbot-phase1-browser-2026-05-04.json`

Actual browser path:

- Served `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/index.html`
- Served `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/config/site-config.json`
- Opened `#chatbot-toggle`
- Asked the eight V1 FAQ questions
- Asked one unknown question: `What is Harry's favorite dessert?`
- Entered `test@example.com` into the fallback form
- Intercepted `http://localhost:8888/chatbot-question.php`

Observed result:

- 8 FAQ answers rendered.
- 1 fallback request was emitted.
- Fallback request body included the unknown question, email, and `was_fallback: true`.

## Files Verified

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js/chatbot.js`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/css/chatbot.css`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/chatbot-question.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/schema.sql`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/admin/dashboard.php`

## FAQ Coverage

The frontend FAQ matcher covers the V1 Phase 1 set:

- Reunion date/time
- Venue/location
- RSVP link
- Attendee list link
- Dress code
- Ticket pricing
- Sponsor tiers
- AI/bot identity question

The implementation follows the V1 rule: unmatched questions do not receive invented answers. They get a graceful fallback and email capture.

## Fix Applied During Verification

`frontend/css/chatbot.css` now includes:

```css
.chatbot__panel[hidden] {
  display: none;
}
```

Without this rule, the hidden panel still intercepted pointer events and blocked the floating bubble click in the browser proof.

## Remaining Blockers

- `backend/chatbot-question.php` cannot be runtime-smoked without DB/config/secrets.
- Committee notification through Resend cannot be verified until `RESEND_API_KEY`, verified sender/domain, and backend config exist.
- Admin response workflow is only dashboard-count visibility; there is no dedicated chatbot response management page yet.
- Voice/TTS is not implemented. That is Phase 2+ and not required for Phase 1.

## Reusable Platform Gap

Studio needs a reusable **widget hidden-state browser check** for generated floating panels and modals. The failure class is simple: `[hidden]` elements styled with `display:flex/grid/block` can still intercept clicks unless the component CSS explicitly handles `[hidden]`.
