## 1. Make transcript row geometry safe and consistent

- [x] 1.1 Align measurement, clipping, padding, and styled-span grapheme boundaries for invisible Unicode and ANSI-interrupted clusters without importing Pi into neutral UI components.
- [x] 1.2 Normalize row-moving content controls before transcript paint while preserving source/copy mapping, supported styles, links, and image payloads.
- [x] 1.3 Add focused geometry and terminal-cell regressions for word joiners, tabs, carriage returns, style-split emoji, ordinary steering markers, and unchanged supported content.

## 2. Anchor scrollbar paint independently of transcript content

- [x] 2.1 Carry bounded rail placement and resolved cell styling through owned frame metadata and the neutral terminal presentation contract.
- [x] 2.2 Paint exposed rail/gutter cells at their physical column inside the existing synchronized terminal transaction, preserving cursor state, modal occlusion, comparison behavior, and image transport.
- [x] 2.3 Integrate fixed rail painting with full and differential writes, regional scroll, row caches, stale-frame rejection, presentation resets, hyperlink cleanup, visibility changes, and geometry changes.
- [x] 2.4 Add emitted-terminal-cell regressions for content replacement, scrolling, steering lifecycle, resize, dock changes, selection/backgrounds, rail styles/appearance, occlusion, and cached/damage-aware repainting.

## 3. Keep tool-block backgrounds continuous through nested resets

- [x] 3.1 Preserve the owning tool-block background when nested content emits default/reset background sequences, without flattening intentional nested backgrounds or changing source copy.
- [x] 3.2 Add terminal-cell regressions for literal ANSI bytes displayed in source diffs, nested styling resets, clipping/padding, and repeated cached/changed frames.
