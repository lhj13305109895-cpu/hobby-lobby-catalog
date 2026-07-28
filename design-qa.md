**Evidence**

- Source visual truth: `qa/source-selected-hero.png`
- Implementation screenshot: `qa/implementation-desktop.png`
- Combined comparison: `qa/design-qa-comparison.png`
- Motion evidence: `qa/loop-frame-a.png` and `qa/loop-frame-b.png`
- Viewport: 1586 × 1024 CSS px, device scale factor 1
- Source pixels: 1586 × 1024; implementation pixels: 1586 × 1024
- State: Chinese desktop storefront, top of page, automatic catalogue loop running

**Findings**

- No actionable P0/P1/P2 visual differences remain. The fixed artwork, typography, palette, primary pot, navigation, CTAs, curved runway, and controls use the selected source image as the visual truth.
- Intentional functional enhancement: only the rear left and rear right product windows are replaced by live catalogue tracks. The central pot and surrounding composition remain fixed.
- The browser capture can show a narrow stitched fragment from the following page region at its bottom edge; DOM inspection confirmed that the duplicate live header and live hero are hidden in this desktop state, so this is capture tooling behavior rather than rendered page content.

**Required Fidelity Surfaces**

- Fonts and typography: passed; baked source typography is unchanged.
- Spacing and layout rhythm: passed; the exact 1586 × 1024 source composition is retained.
- Colors and visual tokens: passed; the warm ivory, red, black, and beige palette is unchanged.
- Image quality and asset fidelity: passed; source hero is displayed at native aspect ratio and live products use existing catalogue image assets with `object-fit: contain`.
- Copy and content: passed; selected Chinese headline, navigation, CTA, and language labels remain unchanged.

**Interaction Verification**

- Both catalogue tracks contain 20 entries (10 products duplicated once for a seamless loop), 40 rendered items total.
- Track positions changed between captures: right 759.67 → 630.50 px; left -370.92 → -472.90 px.
- Broken images: 0.
- Horizontal page overflow: false.
- Existing admin function tests: 5 passed, 0 failed.
- Production build: passed.

**Comparison History**

- Earlier P1: rear imagery only drifted a copy of the reference artwork, so it did not truly cycle the user's catalogue.
- Fix: replaced both drift layers with duplicated real-product tracks sourced from `heroShowcasePatterns`, using a linear `translateX(-50%)` loop.
- Post-fix evidence: both track bounding positions changed over 2.2 seconds, all 40 live catalogue items rendered, and the fixed central pot stayed unchanged.

**Focused Region Comparison**

- Focused review covered the left rear window, central pot overlap boundary, and right rear window. No overlay crosses the central product silhouette; moving items remain contained in the curved rear band.

**Follow-up Polish**

- P3: animation duration can be tuned later if the user prefers faster or slower movement; current durations are 38 seconds (left) and 30 seconds (right).

final result: passed
