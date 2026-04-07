# Contact Form Component Skill

## Identity
- Component type: contact-form
- Current version: 1.0
- Usage count: 0

## Required Fields
- phone (type: phone) — always present, renders as tel: link
- email (type: email) — always present, renders as mailto: link
- form-heading (type: text) — always present
- form-cta (type: link) — always present, submit button text

## Optional Fields
- address (type: address) — street, city, state, zip
- hours (type: hours) — days, times, closed days
- faq (type: list) — FAQ items with question/answer pairs

## HTML Template Structure
```html
<section data-section-id="contact-form" data-section-type="contact">
  <div data-component-ref="contact-form">
    <h2 data-field-id="form-heading" data-field-type="text">Contact Us</h2>
    <form data-netlify="true" name="contact">
      <input type="text" name="name" placeholder="Your Name" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="tel" name="phone" placeholder="Phone">
      <textarea name="message" placeholder="Message"></textarea>
      <button type="submit" data-field-id="form-cta" data-field-type="link">Send Message</button>
    </form>
    <div class="contact-info">
      <a data-field-id="phone" data-field-type="phone" href="tel:+15551234567">(555) 123-4567</a>
      <a data-field-id="email" data-field-type="email" href="mailto:info@example.com">info@example.com</a>
      <div data-field-id="address" data-field-type="address">123 Main St, City, ST 12345</div>
      <div data-field-id="hours" data-field-type="hours">Mon-Fri 9am-5pm</div>
    </div>
  </div>
</section>
```

## CSS Variables
- --form-accent: CTA button and focus ring color
- --form-bg: Form background
- --form-text: Form text color
- --form-input-bg: Input field background
- --form-border-radius: Border radius for inputs and buttons

## When to Use
Generate this component when the user needs a contact page, booking form, or inquiry section. Always include phone and email as data-field-id marked elements for surgical editing.
