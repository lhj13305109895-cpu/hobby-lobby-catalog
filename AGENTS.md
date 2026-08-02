# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable Product Decisions

- The selected visual target is Product Design ideation option 1: a warm editorial brand showcase with ivory surfaces, charcoal serif headings, and restrained Hobby Lobby red accents.
- The product model is 319, offered in 1.6L and 2.0L capacities.
- The catalogue price is ¥29 RMB for 1.6L and ¥31 RMB for 2.0L.
- The homepage hero must prominently communicate pattern customization: buyers can choose existing patterns or supply artwork, colors, or branding for a custom pattern. Keep this informational for now; do not add an inquiry form unless requested.
- The selected hero direction is “花色，由你定义”: one fixed real product image in front, with a slow continuously scrolling runway of real catalogue products behind it. New visible white-body products should join this showcase automatically.
- Product display is the primary purpose of the site. The gallery must show every supplied pattern individually and group patterns by design series.
- The catalogue now contains 83 visible images: the previous 70-image catalogue after removing `319-12 不锈钢光板`, plus 13 additional images numbered 319-72 through 319-84 from `C:\Users\33865\Documents\WXWork\1688855150255110\Cache\Image\2026-07`.
- The 13 additional images use `阿拉伯茶饮系列`, `斋月祝福系列`, and `花鸟雅集系列`; any image showing several different patterns belongs to `混色套装系列` and uses a clear mixed-set name in Chinese and English.
- The 13 newly supplied set images belong to `混色套装系列`; mixed colors can be selected together.
- Include supplied plain blank-board/base product images as the `素色光板系列` when they are part of today's product image set.
- `素色光板系列` should only keep `319-43 黑盖钢色光板` and `319-58 白色光板`; do not show `319-12 不锈钢光板`.
- Keep a dedicated complete pattern gallery. Pattern cards should not jump to a lower preview section; double-clicking a product image opens a large-image lightbox instead.
- In exported selection sheets, center square or portrait images by their visible product bounds rather than the source canvas. Landscape set images must show the complete source image without cropping the logo, fill the image area, and keep a small even inset so the black cell border remains visible.
- Keep the mobile catalogue at two columns and use compact cards so several patterns are visible in one phone viewport.
- Catalogue cards must use optimized thumbnails with lazy loading; keep full-resolution images for the lightbox and exported selection sheets only.
- Exported `.xlsx` selection sheets must use standards-compatible embedded picture anchors so product images remain visible in mobile spreadsheet viewers.
- The left side of the catalogue includes a sticky series directory for jumping between flower/pattern series.
- The lightbox supports mouse-wheel zoom from 100% to 300%.
- The lightbox price area must show both price and packing: 1.6L ¥29 RMB / 24 pcs, 2.0L ¥31 RMB / 20 pcs.
- Include a cart-like selected-pattern basket. Customers select the specific capacity for each pattern, not just the pattern itself. A pattern can include 1.6L, 2.0L, or both.
- The selected-pattern basket can export a Word-compatible `.doc` selection sheet containing images, model/pattern number, series, capacity, price, and packing count.
- Keep the page background warmer and more premium than plain white; use subtle gradients and catalogue-like depth.
- Keep `混色套装系列` / `Mixed Set Series` as the final visible catalogue series. Give every set a descriptive Chinese and English name; do not use sequence-only names such as `混色套装 01` or `Mixed Set 01`.
