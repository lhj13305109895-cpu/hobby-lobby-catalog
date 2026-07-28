**Evidence**

- Source visual truth: `qa/source-selected-hero.png`
- Browser-rendered implementation: `http://127.0.0.1:4173/`
- Verified viewport: 1390 × 697 CSS px, device scale factor 1
- State: Chinese desktop storefront, top of page, static product curtain

**Findings**

- No actionable P0/P1/P2 issue remains in the corrected version.
- The erroneous foreground duplicate and the large rectangular motion tracks were removed.
- The selected hero remains the fixed visual truth. Rear curtain positions now show distinct real catalogue products without animated overlays.

**Required Fidelity Surfaces**

- Fonts and typography: passed; source typography remains unchanged.
- Spacing and layout rhythm: passed; the selected composition and central-product scale remain intact.
- Colors and visual tokens: passed; warm ivory, beige, red, and black remain consistent.
- Image quality and asset fidelity: passed; existing catalogue thumbnails use `object-fit: contain` and `mix-blend-mode: multiply` to merge their white backgrounds into the rear panels.
- Copy and content: passed; headline, navigation, CTA, and language labels remain unchanged.

**Interaction Verification**

- Animated rear catalogue slots were removed completely.
- The curtain uses unique static products with no repeated pattern and no floating thumbnail boxes.
- Broken images: 0.
- Horizontal overflow: false.
- Browser warnings/errors: 0.
- Existing admin function tests: 5 passed, 0 failed.
- Production build: passed.

**Comparison History**

- P1: large moving layers crossed the central product and produced a visible half-product seam.
- Failed intermediate fix: a separate foreground product was misaligned and created two large central products; the broad right track also appeared as a white rectangle.
- Final fix: removed the foreground duplicate, broad tracks, and all animated rear-panel overlays; rebuilt the static curtain with unique catalogue products.
- Post-fix evidence: exactly one central product is visible; no layer crosses it; each rear product pattern is different.

**Focused Region Comparison**

- Reviewed the central-pot edges, lid and handle, every rear curtain position, and the right arrow. No foreground duplication, repeated rear pattern, or floating rectangular overlay remains.

**Follow-up Polish**

- No motion setting remains for the desktop reference hero.

final result: passed
