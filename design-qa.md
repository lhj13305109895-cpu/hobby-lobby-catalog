# Design QA — centered square exports

## Evidence

- Source visual truth: `C:\Users\33865\AppData\Local\Temp\codex-clipboard-3136c08f-5247-45d7-a34e-f02ab136b3c0.png`.
- Implementation: `http://localhost:5173/studio/` with both 1.6L / 365.99 × 183 mm and 2.0L / 365.99 × 235 mm selected in turn.
- Export evidence: `C:\Users\33865\Downloads\壶身图案预览-1.6L-1788926327808.png` and `C:\Users\33865\Downloads\壶身图案预览-2.0L-1788926480722.png`.
- Both verified exports are 1600 × 1600 pixels.

## Findings

- P0/P1/P2: none remaining.
- P3: none remaining for the requested crop and centering change.

## Required fidelity surfaces

- Fonts and typography: no typography changes were requested or made.
- Spacing and layout rhythm: export-only camera framing places the complete pot at about 70% of the square height, with balanced top/bottom whitespace and optical centering. The on-screen preview camera remains independent.
- Colors and visual tokens: the 1.6L default body is a restrained cream/off-white (`#EEE8D9`); lid, spout, handle, and press tab use a cleaner matte white (`#F7F6F2`). The two materials remain visibly related but distinguishable.
- Image quality and asset fidelity: the original GLB geometry is unchanged. A neutral reflection environment affects only the product surface and adds broad, soft edge roll-off without becoming a visible background or mirror reflection.
- Background: both capacities export on solid `#F8F8F6`; the floor and all shadows are hidden for export.
- Copy and content: capacity, wrap dimensions, control labels, and export text remain unchanged.

## Focused material comparison

- Body: cream tint, soft shoulder roll-off, low clearcoat, non-metallic response, and reduced specular intensity read as a finished coated product rather than a raw white model.
- Fixtures: lid, handle, spout, and press tab retain a cleaner white with higher roughness and lower clearcoat than the body.
- Edges and seams: existing modeled edge softness is reinforced by broad material reflections; seam contrast remains light and natural. No geometry or silhouette was altered.

## Comparison history

1. The first square export placed the pot at roughly 55% of canvas height and slightly above center (P2).
2. Export camera distance was reduced from 8.05 to 6.25 and the export target was recentered vertically.
3. The 1.6L post-fix export occupies about 72% of canvas height and is vertically centered.
4. The same framing was verified for 2.0L. Its legacy beige floor and shadow were still visible in the first check (P2), so export now temporarily hides the floor and uses the clean light background before restoring preview state.

## Interaction and runtime checks

- 1.6L loads with matte selected and the new cream/white defaults.
- Switching to 2.0L restores its previous gloss finish and previous `#F8F5E8` / `#F3F1E9` defaults.
- Switching back to 1.6L restores the new matte material defaults.
- Existing rotation, zoom, upload, color controls, and finish controls remain available.
- `重置模型视角` returns the 1.6L product to the new fitted overview; verified visually.
- Browser console: no runtime errors; only existing Three.js deprecation/driver precision warnings.
- Actual 1.6L and 2.0L downloads both resolve to 1600 × 1600 PNGs with the requested centered scale.
- Production build completes successfully on 2026-09-09.

final result: passed
