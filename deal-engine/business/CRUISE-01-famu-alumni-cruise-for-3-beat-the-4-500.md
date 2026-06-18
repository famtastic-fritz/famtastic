# FAMU Cruise — Savings Playbook

**Task:** FAMU alumni cruise for 3 — beat the $4,500 quote
**Baseline (conventional booking):** $4,500 for 3 travelers
**Modeled floor after stacking levers:** ~$2,315
**Estimated total savings:** $2,185 (48% off)
**Routed via:** `anthropic/claude-haiku-4.5` (tier `cheap`, mode `stub`, est. cost $0.000936)

> The conventional $4,500/3-person quote is the *retail* path. Every lever below
> is a seller-side or timing advantage the prior research attempt identified but
> never executed. The single biggest unlock is the agency login it stumbled onto:
> that is the host-agency credential lane.

## Savings levers (highest ROI first)

- **Host-agency commission rebate** — est. save $450 (10%)
  - The prior attempt's one real find — an agency login — IS the unlock. A host agency (Avoya, Dream Vacations, KHM, Travel Quest) issues you advisor credentials. As the booking advisor you earn 10-16% commission and can rebate most of it to your own booking. On a $4,500 fare that is $450-700 back.
- **FAMU alumni group block / shared-amenity rate** — est. save $324 (8%)
  - Alumni cruises are sold as group blocks. Booking inside the official block (or forming an 8-cabin block of your own) unlocks group pricing, 1 free berth per 8 cabins (tour-conductor credit), and group amenity points.
- **Refundable deposit + price-drop re-fare** — est. save $224 (6%)
  - Book refundable, then monitor. Cruise fares drop repeatedly before sailing; re-fare each drop. Tools: cruise price-watch. Historically 5-8% recoverable with zero penalty on refundable fares.
- **3rd/4th guest sails free + kids/companion promos** — est. save $420 (12%)
  - For 3 travelers, put the third in promos where 'guests 3 & 4 sail free' — you pay taxes/fees only on the third. That alone can cut a 3-person fare ~1/3 on the qualifying portion.
- **Shoulder-season / repositioning alternative** — est. save $462 (15%)
  - If dates flex, a repositioning or shoulder-week sailing of the same ship/route runs 20-40% cheaper. Offered as an alternative itinerary, not a replacement.
- **Onboard credit + loyalty/casino offer stacking** — est. save $131 (5%)
  - Stack agency OBC + cardmember OBC + shareholder OBC ($50-250 ea) + any casino/loyalty certificate. These don't cut fare but offset onboard spend dollar-for-dollar, effectively lowering total trip cost.
- **Cabin guarantee (GTY) rate** — est. save $174 (7%)
  - A 'guarantee' cabin (you pick category, line picks the room) is the cheapest way into a category, typically 5-10% under assigned rooms.

## Execution order

1. **Claim the advisor lane.** Apply to a host agency (free to low-cost). This
   converts the "agency login" finding into rebate authority.
2. **Find / form the FAMU alumni block.** Verify the organizer contact (the prior
   attempt found a phone + two mismatched emails — verify before any outbound;
   see LEARNINGS.md).
3. **Book refundable**, lock the 3rd-guest-free promo, choose a GTY cabin.
4. **Price-watch and re-fare** every drop until final payment.
5. **Stack OBC** at the end; it offsets onboard spend.

## Honesty / limits
- Offline mode models *levers and percentages*, not live quotes. Wire a live
  model/data key (SETUP.md) to attach current sailing prices to each lever.
- No money is moved. No outbound contact is sent. This is a plan, not an action.
