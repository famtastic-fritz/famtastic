# Test Hero Export Component Skill

## Identity
- Component type: generic
- Component ID: test-hero-export
- Current version: 1.1
- Usage count: 4
- Used in: site-auntie-gale-garage-sales
- Last updated: 2026-04-09T05:12:50.154Z

## Required Fields
- hero-label (type: text) — default: "Curated Estate & Garage Finds"
- hero-headline (type: text) — default: "DEALS SO GOODIT FEELS LIKESTEALING"
- hero-subheadline (type: text) — default: "New treasures every weekend — Denver Metro Area"
- hero-cta (type: text) — default: "Shop This Weekend's Deals →"
- buddy-speech-hero (type: text) — default: "New treasures every weekend!"

## Required Slots
- hero-video (role: generic)
- buddy-hero-peek (role: generic)

## CSS Variables
- (no CSS variables detected)

## HTML Template Structure
```html
<section class="hero-section" data-section-id="hero">
  <video class="hero-video-bg" autoplay="" muted="" loop="" playsinline="" poster="assets/video/hero-still.png" data-slot-id="hero-video" data-slot-status="google-generated">
    <source src="assets/video/hero.mp4" type="video/mp4">
  </video>
  <div class="hero-overlay"></div>

  <!-- Starburst 1 — top left -->
  <div class="starburst" style="position:absolute;top:2rem;left:2rem;width:100px;height:100px;background:#FBBF24;z-index:15;transform:rotate(8deg);">
    <span style="text-align:center;font-size:0.95rem;line-height:1.1;color:var(--dark);">OPEN<br>SAT &amp;<br>SUN</span>
  </div>

  <!-- Starburst 2 — upper mid -->
  <div class="starburst" style="position:absolute;top:1.5rem;left:44%;width:80px;height:80px;background:var(--primary);z-index:15;transform:rotate(-5deg);">
    <span style="text-align:center;font-size:0.8rem;line-height:1.1;color:var(--white);">FREE<br>ENTRY</span>
  </div>

  <!-- Starburst 3 — mid-left edge -->
  <div class="starburst" style="position:absolute;top:52%;left:0.75rem;transform:translateY(-50%) rotate(12deg);width:72px;height:72px;background:var(--green);z-index:15;">
    <span style="text-align:center;font-size:0.7rem;line-height:1.1;color:var(--white);">NEW<br>ITEMS</span>
  </div>

  <!-- Hero text -->
  <div class="hero-content" style="padding:2rem 1.5rem 2rem 2.5rem;">
    <div class="section-label" data-field-id="hero-label">Curated Estate &amp; Garage Finds</div>
    <h1 class="hero-title" data-field-id="hero-headline">DEALS SO GOOD<br>IT FEELS LIKE<br>STEALING</h1>
    <p class="hero-subtitle" data-field-id="hero-subheadline">New treasures every weekend — Denver Metro Area</p>
    <a href="shop.html" class="hero-cta" data-field-id="hero-cta">Shop This Weekend's Deals →</a>
  </div>

  <!-- Buddy peeking from right -->
  <img src="assets/buddy/buddy-peek-right.png" alt="Buddy the woodpecker mascot peeking in" class="buddy-peek-right" data-buddy-placement="hero-peek" data-s
```

## When to Use
Every site that needs a generic. Use this component to ensure consistency and surgical editability.

## Lessons Learned
- No lessons recorded yet.
