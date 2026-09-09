# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable Product Decisions

- The 28 images added on 2026-08-13 are numbered 319-151 through 319-178. Every image showing multiple pots is retained as one `混色套装系列` / `Mixed Set Series` entry; single-pot images use `316不锈钢花卉系列` or the new `田园萌兔系列` / `Cottage Rabbit Series`.

- The selected visual target is Product Design ideation option 1: a warm editorial brand showcase with ivory surfaces, charcoal serif headings, and restrained Hobby Lobby red accents.
- The product model is 319, offered in 1.6L and 2.0L capacities.
- The catalogue price is ¥29 RMB for 1.6L and ¥31 RMB for 2.0L.
- The homepage hero must prominently communicate pattern customization: buyers can choose existing patterns or supply artwork, colors, or branding for a custom pattern. Keep this informational for now; do not add an inquiry form unless requested.
- The selected hero direction is “花色，由你定义”: one fixed real product image in front, with a slow continuously scrolling runway of real catalogue products behind it. New visible white-body products should join this showcase automatically.
- Product display is the primary purpose of the site. The gallery must show every supplied pattern individually and group patterns by design series.
- The catalogue now contains 149 visible images. The 28 images added from `E:\电脑相册` are numbered 319-105 through 319-132; 20 single-product images are assigned to descriptive series and 8 multi-product scene images belong to `混色套装系列`.
- The added catalogue series are `柔彩花园系列`, `瓷韵华纹系列`, `东方意境系列`, `欢乐童趣系列`, and `丝路故事系列`.
- The 18 images added on 2026-08-05 are numbered 319-133 through 319-150; 14 are single-product images and 4 are multi-product scene images. The new series are `民俗繁花系列` and `极简艺术系列`; scene images remain in `混色套装系列`.
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
- The catalogue includes an integrated `/studio/` pattern preview tool. It accepts JPG, PNG, and WEBP artwork by file selection, drag-and-drop, or clipboard paste for the 365.99 × 183 mm body wrap; the 3D model may rotate horizontally only, with vertical orbit locked.
- For the 1.6L / 365.99 × 183 mm studio model, preserve the model geometry, proportions, handle, spout, lid, and press-tab structure. The vessel body defaults to a refined cream/off-white matte finish; the lid, spout, handle, and press tab default to a slightly drier white matte plastic. Keep soft edge highlights and restrained seam depth, with no mirror-like reflections or white-clay test-model appearance. Avoid mesh-like self-shadow banding.
- The default 1.6L studio camera must frame the full product with visible breathing room around the lid, spout, handle, and base, including on shorter desktop browser windows. `重置模型视角` returns to this fitted overview. Keep the 2.0L camera unchanged.
- The 1.6L / 365.99 × 183 mm studio preview and exported PNG use a clean solid light gray-white background (`#F8F8F6`) with no ground or contact shadow. Do not show lifestyle props, photographic scenery, or a logo in this view. Keep the 2.0L background controls unchanged.
- `导出当前视图` always outputs a 1600 × 1600 PNG for both 1.6L and 2.0L. The complete pot occupies about 70% of the square height and is optically centered with balanced top/bottom whitespace while preserving the user's current horizontal viewing angle; export framing is independent from the on-screen preview zoom. Both capacities export on the same clean `#F8F8F6` background with the studio floor and shadow hidden.
- Add the supplied `pot-145.glb` as a third studio model named `318 2.0L` without replacing the existing 319 1.6L or 319 2.0L models. Its vessel body is 145 mm diameter × 171 mm high, while the complete product is 197.51 mm high. Its maximum printable body band is 145 mm high and begins about 5 mm above the base. Use the print factory's actual wrap width of 445.8 mm rather than the theoretical circumference. Uploaded artwork may be shorter than 145 mm: infer its physical height from its aspect ratio at 445.8 mm wide, cap it at 145 mm, keep the height editable, and never stretch shorter artwork to the maximum height. Runtime cylindrical UVs must display upright and must split/wrap seam-crossing triangles so no white or compressed seam appears.
- For the new 145 mm pot, artwork must conform to the supplied GLB's actual bulged body, tapered shoulder, and rounded base. Never use a separate regular cylinder as the visible print carrier; it cuts through the curved body and creates white gaps. Keep artwork off the lid, spout, and handle.
- Name the four studio choices `319 1.6L`, `319 2.0L`, `318 1.2L`, and `318 2.0L`. The `318 1.2L` choice reuses the earlier `pot-454.glb` production model: its body is 108 mm high, and its fixed 454.27 × 91 mm artwork prints upward from the base, leaving the top 17 mm unprinted. Never stretch its 91 mm artwork over the full 108 mm body.
- All four studio previews and exported PNGs use the same clean `#F8F8F6` white background, no visible floor or shadow, and centered square export framing.
- The default and reset view for `318 2.0L` is a near-straight frontal view with a restrained downward angle so the lid/body seams and artwork baselines read level rather than visually tilted.
- Each of the four studio models owns an independent uploaded artwork, preview, physical-height calculation, and placement settings. Uploading or adjusting artwork on one model must not affect any other model; switching away and back restores that model's saved artwork and settings.
- The studio supports a 1–4 pot group preview for the currently selected model. Every pot slot owns its own artwork, preview, physical print height, and placement settings; switching slots restores that pot's values. Group exports keep the whole set centered on the same square white background.
- In multi-pot mode, each `第 N 只` slot card is also a direct image drop target. Dropping a JPG, PNG, or WEBP onto a card selects that slot and replaces only that pot's artwork; keep the main upload dropzone available as well.
- Add two mixed-size pair presets: `319 一大一小` combines 319 1.6L (left) with 319 2.0L (right); `318 一大一小` combines 318 1.2L (left) with 318 2.0L (right). The large vessel must visibly scale larger, both bases align, and their artwork remains the one saved independently on each corresponding model. Keep a narrow clear gap and export the mixed pair as a centered white-background square image.
- Multi-pot groups use a single straight horizontal row: every pot faces the same direction, all bases align, and the complete silhouettes (including spout and handle) keep a narrow white gap without overlapping. Keep the established plain white export background; reference lifestyle images guide arrangement only, not scenery, logos, or promotional text.
- The default and reset view for `318 1.2L`, including group mode, must be a front-biased product angle with the spout visible on the left and the complete handle visible on the right; never present the back side as the default group view.
- The approved `318 1.2L` front view uses a half-turn product orientation (`rotation.y = -π/2`): the body faces squarely forward, the spout reads in full side profile on the left, and the handle opening is broad and fully visible on the right. Use this identical angle for single-pot preview, group preview, reset, and export.
- Multi-pot square exports must make the full row large and readable: fit 2, 3, or 4 complete silhouettes to almost the full canvas width with only a small safe margin, while remaining centered and uncropped. Do not reuse the single-pot camera distance or leave a large empty white field around the set.
- For `318 1.2L` multi-pot groups, calculate center spacing from about 116% of the scaled product height instead of the GLB's oversized authored width bounds. Keep visible white space between every complete silhouette: handles, spouts, and bodies must neither touch nor overlap. Preserve matching front angles and aligned bases.
- Keep multi-pot overview exports as a clean, single horizontal row and fit them tightly to the square width. Since four complete pots cannot also fill the square height without overlap, provide an `导出当前壶高清图` action for the selected slot; it exports that pot alone, large and centered, for legible artwork inspection.
- On desktop, the left 3D viewer is a fixed full-height workspace panel: it must stay visible from the top of the viewport and never inherit the right control panel's long document height. Only the right control panel scrolls; retain ordinary stacked page scrolling on narrow/mobile screens.
