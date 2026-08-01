# Proof media machine contract

Input slots are `<img>` elements with a unique `data-slot-id`, a semantic `data-slot-role`, and `data-slot-status="empty"`.

Successful fulfillment changes the source to `assets/<slot-id>.jpg`, changes status to `generated`, validates the file, and records an entry in `design-dna.json` under `media_fulfillment.assets`.

Allowed completion states:

- `fulfilled`: all required slots were generated and validated.
- `not_needed`: the proof contains no required empty image slots.

Anything else is not customer-ready. The proof job must fail before thumbnail capture and callback delivery instead of silently substituting decorative CSS.
