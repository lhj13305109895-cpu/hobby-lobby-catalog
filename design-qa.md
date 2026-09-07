# Design QA — 1.6L / 365.99 × 183 mm surface finish

## Evidence

- Source visual truth: `C:\Users\33865\Documents\xwechat_files\wxid_pha984yzf9or22_2365\temp\RWTemp\2026-09\9e20f478899dc29eb19741386f9343c8\374aad74ad3f91cce4a3fc5488c003fd.jpg`
- Source pixels: 1412 × 1883.
- Implementation: `http://localhost:5173/studio/`, 1.6L selected, blank body, warm backdrop, gloss selected, default body and fixture colours.
- Browser-rendered implementation screenshot evidence: Codex in-app browser tab 4, captured at a 1268 × 713 viewport after the model reached the ready state.
- Combined comparison evidence: temporary same-origin comparison view placed the real-product photo and the live WebGL canvas side by side at the same browser viewport. The comparison helper and copied reference were not retained in the production build.
- Density normalization: both sides were fitted into equal CSS comparison panels; no pixel-level shape comparison was used because the source is a close showroom crop and the implementation is a full-product studio view.

## Findings

- P0/P1/P2: none remaining.
- P3: The real photo contains stronger fluorescent-strip reflections than the neutral studio preview. This is an expected lighting-environment difference; the implementation now expresses the same material hierarchy without copying the showroom surroundings.

## Required fidelity surfaces

- Fonts and typography: no typography change was in scope; existing studio typography and hierarchy remain unchanged.
- Spacing and layout rhythm: no layout change was in scope; the 3D viewer and controls remain aligned and usable at the checked viewport.
- Colors and visual tokens: original body colour `#F8F5E8`, fixture colour `#F3F1E9`, backdrop, and exposure are preserved.
- Image/material quality: 1.6L self-shadow banding is removed; the body uses a high-gloss coated response with broad studio highlights; lid, spout, and handle retain a softer matte response; floor shadow remains.
- Copy/content: capacity remains 1.6L and dimensions remain 365.99 × 183 mm. Existing control labels are unchanged.

## Comparison history

1. Initial implementation showed mesh-like moiré/self-shadow bands across the vessel and fixtures. Fixed by disabling self-shadow reception only on the 1.6L production mesh while retaining cast shadow onto the floor.
2. The real-product reference clarified that the vessel and fixtures use different finishes. Fixed by increasing the body's gloss/clearcoat response, overriding the shared-mesh fixture regions to a soft matte finish, and adding broad studio softboxes.
3. Final browser check showed a clean continuous vessel surface, preserved original colour, matte fixtures, working controls, and no visible self-shadow bands. No actionable P0/P1/P2 issues remained.

## Interaction and runtime checks

- 1.6L / 365.99 × 183 mm is selected after reload.
- Model reaches ready state and export control becomes enabled.
- Horizontal rotation, zoom hints, finish selector, colour controls, and upload area remain present.
- Production build completes successfully.

final result: passed
