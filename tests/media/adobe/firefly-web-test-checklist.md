# Adobe Firefly Web App Test Checklist
## Using Existing Creative Cloud Subscription

### Setup
- [ ] Go to https://firefly.adobe.com
- [ ] Sign in with your Adobe Creative Cloud account
- [ ] Note how many generative credits you have available: ___

### Test A — Image Generation (Single Shoe)
- [ ] Generate: "Luxury men's leather oxford shoe on dark slate surface, dramatic side lighting, warm gold highlights, studio photography"
- [ ] Rate quality 1-10: ___
- [ ] Download the best result to ~/famtastic/tests/media/adobe/shoe-1.png
- [ ] Note credits consumed: ___

### Test B — Style Reference (IMAGE SET COHERENCE TEST)
- [ ] Upload the shoe image you just generated as a Style Reference
- [ ] Generate with style reference: "Luxury men's alligator leather loafer on dark slate surface, dramatic side lighting, premium product shot"
- [ ] Adjust the Strength slider — try 50%, 75%, 100%
- [ ] Rate how well it matches the original's style: ___/10
- [ ] Repeat for:
  - [ ] "Luxury men's leather chelsea boot on dark slate surface, dramatic side lighting"
  - [ ] "Close-up of luxury leather shoe craftsmanship details, hand-stitching, dramatic side lighting"
- [ ] Download all results to ~/famtastic/tests/media/adobe/
- [ ] Rate overall set coherence 1-10: ___

### Test C — Text-to-Video
- [ ] Check if video generation is available on your plan: Yes / No
- [ ] If YES: Generate "Flickering candles, tarot cards, incense smoke, dark mystical atmosphere, slow cinematic movement"
- [ ] If NO: Note that video requires Firefly Standard ($9.99/mo)
- [ ] Note credits consumed: ___

### Test D — Other Models Access
- [ ] Check if partner models are available (Google Veo, ChatGPT Image, Runway, etc.): Yes / No
- [ ] If YES: Test one third-party model with the shoe prompt
- [ ] If NO: Note that partner models require Firefly Standard

### Test E — Generative Fill (Photoshop)
- [ ] Open Photoshop
- [ ] Open one of the generated shoe images
- [ ] Use Generative Fill to extend the background
- [ ] Use Generative Fill to add a second shoe to the composition
- [ ] Rate quality 1-10: ___
- [ ] Note credits consumed: ___

### Results Summary
Fill in after completing all tests:

| Metric | Value |
|--------|-------|
| Credits available at start | ___ |
| Credits remaining after tests | ___ |
| Image quality rating | ___/10 |
| Style reference coherence | ___/10 |
| Video available | Yes/No |
| Partner models available | Yes/No |
| Generative Fill quality | ___/10 |
| Overall value assessment | ___ |
| Total credits consumed | ___ |

### Comparison Notes
After completing this checklist, compare with the automated test results:
- Google Imagen shoe images: ~/famtastic/tests/media/google/shoe-{1-4}.png
- Leonardo Phoenix shoe images: ~/famtastic/tests/media/leonardo/shoe-{1-4}.png
- Google Veo hero video: ~/famtastic/tests/media/google/maria-hero.mp4

Which provider's shoes look most like a real product shoot?
Which has the best coherence between the 4 images in a set?
