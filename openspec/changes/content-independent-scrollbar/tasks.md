## 1. Make transcript row geometry safe and consistent

- [x] Align measurement, clipping, padding, and styled-span grapheme boundaries for invisible Unicode and ANSI-interrupted clusters without importing Pi into neutral UI components.
- [x] Normalize row-moving content controls before transcript paint while preserving source/copy mapping, supported styles, links, and image payloads.
- [x] Add focused geometry and terminal-cell regressions for word joiners, tabs, carriage returns, style-split emoji, ordinary steering markers, and unchanged supported content.

## 2. Anchor scrollbar paint independently of transcript content

- [ ] Carry bounded rail placement and resolved cell styling through owned frame metadata and the neutral terminal presentation contract.
- [ ] Paint exposed rail/gutter cells at their physical column inside the existing synchronized terminal transaction, preserving cursor state, modal occlusion, comparison behavior, and image transport.
- [ ] Integrate fixed rail painting with full and differential writes, regional scroll, row caches, stale-frame rejection, presentation resets, hyperlink cleanup, visibility changes, and geometry changes.
- [ ] Add emitted-terminal-cell regressions for content replacement, scrolling, steering lifecycle, resize, dock changes, selection/backgrounds, rail styles/appearance, occlusion, and cached/damage-aware repainting.

## 3. Keep tool-block backgrounds continuous through nested resets

- [ ] Preserve the owning tool-block background when nested content emits default/reset background sequences, without flattening intentional nested backgrounds or changing source copy.
- [ ] Add terminal-cell regressions for literal ANSI bytes displayed in source diffs, nested styling resets, clipping/padding, and repeated cached/changed frames.
