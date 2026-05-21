# Pricing Table Component Skill

## Identity
- Component type: pricing-table
- Current version: 1.0
- Usage count: 0

## Required Fields
- pricing-heading (type: text) — section heading
- Each service card: service-name (text), service-price (price), service-duration (text), service-description (text)

## HTML Template Structure
```html
<section data-section-id="pricing" data-section-type="pricing">
  <h2 data-field-id="pricing-heading" data-field-type="text">Our Services</h2>
  <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <div class="service-card" data-component-ref="service-card">
      <h3 data-field-id="service-tarot-name" data-field-type="text">Tarot Reading</h3>
      <p data-field-id="service-tarot-price" data-field-type="price">$75</p>
      <p data-field-id="service-tarot-duration" data-field-type="text">30 minutes</p>
      <p data-field-id="service-tarot-desc" data-field-type="text">Description here</p>
    </div>
  </div>
</section>
```

## CSS Variables
- --pricing-card-bg: Card background
- --pricing-accent: Price text color (usually gold/accent)
- --pricing-border: Card border style

## When to Use
Generate when the site needs service pricing. Each service gets its own data-field-id for surgical price editing. Use the site's accent color for price display.
