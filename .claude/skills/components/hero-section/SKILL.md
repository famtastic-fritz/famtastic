# Hero Section Component Skill

## Identity
- Component type: hero-section
- Current version: 1.0
- Usage count: 0

## Required Fields
- hero-heading (type: text) — main hero headline
- hero-subheading (type: text) — supporting text below headline
- hero-cta (type: link) — primary call-to-action button

## Required Slots
- hero-1 (role: hero) — full-width background or feature image, 1920x800

## HTML Template Structure
```html
<section data-section-id="hero" data-section-type="hero" class="relative min-h-[80vh] flex items-center">
  <img data-slot-id="hero-1" data-slot-role="hero" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" class="absolute inset-0 w-full h-full object-cover">
  <div class="relative z-10 max-w-4xl mx-auto text-center px-6">
    <h1 data-field-id="hero-heading" data-field-type="text" class="text-5xl font-bold mb-6">Your Headline Here</h1>
    <p data-field-id="hero-subheading" data-field-type="text" class="text-xl mb-8 opacity-90">Supporting text that explains the value proposition</p>
    <a data-field-id="hero-cta" data-field-type="link" href="contact.html" class="inline-block px-8 py-4 bg-accent text-white font-semibold rounded">Get Started</a>
  </div>
</section>
```

## CSS Variables
- --hero-overlay-opacity: Dark overlay opacity (0.3-0.7)
- --hero-text-color: Hero text color (usually white or light)
- --hero-accent: CTA button color

## When to Use
Every site's home page needs a hero. Generate this as the first section of index.html. The hero image slot should be the first stock photo filled. Use data-field-id on all text elements for surgical editing.
