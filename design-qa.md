# Design QA — “花色，由你定义”首页封面

## Visual target

- Selected reference: `qa/source-selected-hero.png`
- Desktop implementation: `qa/implementation-desktop.png`
- iPhone implementation: `qa/implementation-mobile.png`
- Side-by-side comparison: `qa/comparison-desktop.png`

## Verification

- Desktop viewport: 1440 × 900 CSS pixels.
- Mobile viewport: 390 × 844 CSS pixels.
- No horizontal overflow at the mobile breakpoint (`scrollWidth === innerWidth`).
- The foreground product and runway use real catalogue assets with `object-fit: contain`; no pot is stretched or cropped.
- The selected editorial composition, warm ivory surface, restrained red accent, large headline, fixed foreground product, and curved product runway are preserved from the selected reference.
- Mobile adaptation keeps the headline, both primary actions, customization message, moving product runway, foreground product, and controls in the first screen.
- Chinese/English toggle verified in the browser.
- Previous/next runway controls verified; the carousel scroll position changes from 0 to 260 px.
- Browser console warnings/errors: 0.
- Production build: passed (`vite build`).
- Admin function tests: 5/5 passed.

## Findings and iteration history

1. Initial mobile layout placed too much copy above the product. Reduced mobile spacing, headline size, and media height; converted actions to two equal columns.
2. The featured product source had a white square background. Created a background-extracted product asset, removed the chroma key to alpha, and preserved the complete lid, spout, handle, body, pattern, and base.
3. The original carousel filter could include promotional set images. Limited the hero runway to the botanical-floral category so the cover consistently shows individual real products.
4. Replaced the old hero preload with the new featured product asset and updated the page description from 58 to 83 patterns plus customization.
5. Reworked the desktop hero from a hard two-column split into one continuous ivory canvas. The enlarged curved runway now passes behind the headline and foreground product, while a separate curved floor layer creates the same gallery-stage depth as the selected reference.
6. Capped the foreground product by hero height and a 720 px maximum width so wide desktop screens cannot enlarge it beyond the frame or crop the lid and base.

## Known non-blocking repository issue

- `tests/sites-worker.test.mjs` currently imports a missing historical `worker/index.js`; that separate Sites test cannot start in this Cloudflare Pages project. The homepage change does not use that worker. This is not a visual or runtime regression from the hero implementation.

## Severity audit

- P0: none
- P1: none
- P2: none

final result: passed
