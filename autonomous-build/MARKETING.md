# MARKETING — MetaMint go-to-market

> Goal of this plan: get MetaMint in front of the people who feel the broken-link-
> preview papercut every week — indie devs and technical marketers — using only
> free, owned, and community channels. No ad budget assumed.

---

## 1. Positioning

**The promise:** *Mint perfect social previews in 30 seconds — correct tags, a
share image, and a live look at every platform, before you ship.*

**The wedge:** it's the only tool that does **tags + image + multi-platform preview
in one private, no-login screen.** Competitors do one slice (a tag generator, or
an OG-image service, or a preview debugger) and most are ad-laden or want a login.

**Who we talk to first:** solo founders and indie hackers shipping landing pages
and launch posts. They share links constantly, they've been burned by a dead
preview, and they evangelize tools that respect them (free, fast, private).

**The feeling we sell:** *no more cringing when you paste your own link.* Quiet
competence. Your stuff looks intentional everywhere.

**Proof, not claims (FAMtastic doctrine):** the live preview is the demo. The
first-paint "oh, that's exactly what I needed" *is* the pitch. Every piece of
content drives to the tool, where the product proves itself in ten seconds.

---

## 2. Three target channels

### Channel A — Developer communities (primary): Reddit + Hacker News + dev.to
Where the exact buyer hangs out and trades tools.
- Subreddits: r/webdev, r/SideProject, r/indiehackers, r/SaaS, r/Frontend.
- Hacker News: a "Show HN" once the tool is stable and the privacy angle is sharp.
- dev.to / Hashnode: a genuinely useful tutorial that happens to feature MetaMint.
- **Why it works:** these communities reward *free, no-login, solves-a-real-pain*.
  The privacy angle ("runs in your browser, nothing uploaded") is catnip here.
- **Rule:** lead with the lesson or the free tool, never the pitch. Be a person.

### Channel B — X / Twitter + LinkedIn (build-in-public)
The indie-maker audience lives on X; the agency/freelancer audience on LinkedIn.
- Build-in-public thread on the launch; before/after "broken vs minted" visuals.
- Reply-guy *helpfully* under threads where someone's preview is broken.
- LinkedIn post aimed at freelancers/agencies → funnels to the Agency tier.
- **Why it works:** OG previews are *inherently visual and shareable*; a
  side-by-side of a dead card vs. a rich one stops the scroll.

### Channel C — SEO + the product's own footprint (compounding)
Evergreen search demand: "open graph generator", "twitter card preview",
"og image size", "social share preview".
- A small cluster of useful reference pages (the og:image cheat-sheet, the
  "why is my link preview not showing" debugging guide) that rank and funnel.
- The free-tier **watermark on every shared image** = passive distribution; each
  minted image that gets posted is a tiny billboard.
- **Why it works:** this demand is evergreen and high-intent. It costs only
  writing time and compounds long after a launch-day spike fades.

---

## 3. Launch plan

**Pre-launch (this is week 1 of the calendar):**
1. Ship the tool to a real URL; confirm the tool's *own* preview is perfect
   (dogfood — paste metamint.app into X and Slack and screenshot it).
2. Make the "broken vs. minted" before/after image (the hero asset for every channel).
3. Write the Show HN post and the launch thread; line up 3–5 friends to look on day one.
4. Seed the two SEO reference pages so there's depth behind the spike.

**Launch day:**
- Morning: post the build-in-public launch thread on X + the LinkedIn variant.
- Same morning (US time): **Show HN** — title leads with the privacy + all-in-one
  angle, not the brand. First comment = the honest backstory + free-forever scope.
- Midday: r/SideProject + r/webdev posts (each tailored, not copy-pasted).
- Throughout: reply to every comment fast and human; fix anything that breaks live.

**Post-launch (week 2):**
- Publish the dev.to tutorial ("Stop shipping broken link previews").
- Turn the best launch-day question into a follow-up post.
- DM-free outreach: helpfully reply under 5–10 "my preview is broken" threads.
- Measure: tool opens, generate events, downloads, → Pro page views. Iterate copy.

**Success metrics (first 30 days, no ad spend):**
- 2,000+ tool opens; 40%+ run a generate; 15%+ download an image.
- 1 front-page-ish community moment (HN/Reddit) driving a traffic spike.
- 25+ shared images carrying the watermark in the wild.
- First 10 Pro signups (validation that the free→Pro lever works).

---

## 4. Five ready-to-post launch pieces

### Piece 1 — Show HN (Hacker News)
> **Title:** Show HN: MetaMint – OG tags + a share image + live previews, all in the browser
>
> I kept shipping pages with broken link previews — a relative `og:image`, a title
> Google quietly truncated, a card type with no image. You never see it until
> you've already shared the link.
>
> So I built MetaMint. You type a title, description and URL; it generates the
> correct Open Graph + Twitter tags **and** a 1200×630 share image, and shows you
> exactly how the link renders on Google, X, Facebook, LinkedIn, Slack and
> iMessage — side by side, live.
>
> It runs entirely in the browser. Nothing is uploaded, there's no account, and the
> whole thing is built on the Node standard library with zero dependencies. Free
> tier is the real tool (watermarked image); paid adds branded templates and bulk.
>
> Would love feedback on the preview accuracy and which platforms to add next.

### Piece 2 — X / Twitter launch thread
> 1/ Half the web ships with broken link previews. A missing image, a truncated
> title, a bare URL nobody clicks. You don't notice — until you've already shared it. 🧵
>
> 2/ I got tired of cringing at my own pasted links, so I built **MetaMint**.
> Type a title + description → correct OG/Twitter tags + a share image + a live
> preview on 6 platforms. 30 seconds.
>
> 3/ Here's the part I'm proud of: it's all client-side. Nothing uploaded, no
> login, zero npm dependencies. Your unreleased page title never leaves your tab.
>
> 4/ [before/after image: dead gray card → rich minted card]
> Same link. Left: what most pages ship. Right: 30 seconds in MetaMint.
>
> 5/ Free forever for the core. Try it, paste your own site, tell me what's wrong:
> 👉 metamint.app

### Piece 3 — LinkedIn post (agency / freelancer angle)
> Every client landing page you ship is going to get pasted into LinkedIn, Slack,
> and iMessage. If the link preview is broken or blank, that's the first thing the
> client's audience sees — and it quietly tanks the click-through you're being paid
> to deliver.
>
> I built **MetaMint** to kill that papercut. Paste a title and URL, get correct
> Open Graph + Twitter tags and an on-brand 1200×630 share image, and *see* the
> result on six platforms before anything ships. The Agency plan does it in bulk
> from a CSV, so a 40-page site is minutes, not an afternoon in Figma.
>
> Free to try, no login: metamint.app — curious what the freelancers here think.

### Piece 4 — Reddit r/SideProject / r/webdev
> **Title:** I built a no-login tool that generates social preview tags + the share image, with live previews
>
> Sharing a thing I made to scratch my own itch. Every time I shipped a page I'd
> either forget the `og:image`, get the Twitter card type wrong, or have to open
> Figma just to make a 1200×630 image.
>
> MetaMint does the whole thing on one screen: type your title/description/URL →
> correct OG + Twitter tags, a generated share image (SVG + PNG download), and live
> previews for Google, X, Facebook, LinkedIn, Slack and iMessage. A validator flags
> the dumb-but-costly stuff (relative og:url, title too long for Google).
>
> It's fully client-side — nothing uploaded, no account — and the free tier is the
> real tool, not a teaser. Link in the comments to keep this from looking spammy.
> Brutal feedback welcome, especially on preview accuracy.

### Piece 5 — dev.to / Hashnode tutorial
> **Title:** Stop shipping broken link previews: a 5-minute guide to Open Graph (with a tool that checks your work)
>
> **Hook:** You shipped the page. You shared the link. It unfurled as a gray box
> with no image and a truncated title. Here's everything you actually need in your
> `<head>` — and how to verify it before you hit send.
>
> **Body outline:**
> - The 6 tags that matter (`og:title`, `og:description`, `og:image` + dimensions,
>   `og:url`, `twitter:card`) and the 3 mistakes that silently break previews.
> - Why `og:image` must be absolute and 1200×630, with a copy-paste snippet.
> - How to *see* the result before shipping (drop the link into MetaMint, flip
>   through the platform tabs, fix what the validator flags).
> - Bonus: generating the share image without opening a design tool.
>
> **CTA:** "Paste your own URL into MetaMint and check your work — it's free and
> runs in your browser."

---

## 5. Two-week action calendar

### Week 1 — Prep & seed
| Day | Action | Channel | Output |
|-----|--------|---------|--------|
| Mon | Deploy tool to live URL; dogfood (paste into X/Slack, screenshot) | — | Live site, proof screenshots |
| Tue | Create the "broken vs. minted" before/after hero image | Design | Reusable launch asset |
| Wed | Write + schedule X thread and LinkedIn post (Pieces 2 & 3) | X, LinkedIn | Drafts queued |
| Thu | Draft the Show HN post + first comment (Piece 1); line up 3–5 friends | HN | Draft ready |
| Fri | Publish SEO reference page #1: "og:image size & the 6 tags that matter" | SEO/blog | Indexed page |
| Sat | Publish SEO reference page #2: "Why is my link preview not showing?" | SEO/blog | Indexed page |
| Sun | Final QA pass on tool; pre-write 10 replies for common questions | — | Launch-day kit |

### Week 2 — Launch & amplify
| Day | Action | Channel | Output |
|-----|--------|---------|--------|
| Mon | **LAUNCH:** X thread + LinkedIn AM; Show HN AM; reply all day | X, LinkedIn, HN | Launch live |
| Tue | r/SideProject + r/webdev posts (tailored, Piece 4); answer everything | Reddit | 2 threads |
| Wed | Publish dev.to tutorial (Piece 5); cross-post to Hashnode | dev.to | Tutorial live |
| Thu | Helpful replies under 5–10 "broken preview" threads (no pitch-spam) | X, Reddit | Goodwill + clicks |
| Fri | Recap thread: "launch week numbers + what I'm building next" | X | Build-in-public retention |
| Sat | Submit to free directories (BetaList, indie tool lists, Awesome lists) | Directories | Backlinks + trickle |
| Sun | Review metrics; pick the highest-signal channel; plan week 3 doubling-down | — | Iteration plan |

**Standing rule for every post:** lead with the lesson or the free tool, link last,
reply like a human, fix bugs live, and let the preview do the selling.
