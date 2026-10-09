## 1. Declare the background preference

- [ ] 1.1 Add `backgroundStyle` (`Background`, `transparent`/`accent`/`dark`, default `transparent`, live) between `accentColor` and `quitAnimation`, advance the settings version with a preserving migration, and verify declaration and migration tests cover order, defaults, invalid values, and unknown-key preservation.
- [ ] 1.2 Extend settings manager and screen coverage for persistence, live optimistic display, undo, profile isolation, and absence of Pi-settings writes; verify the Appearance section renders `Accent color`, `Background`, and `Quit animation` once in that order.

## 2. Resolve and paint the canvas

- [ ] 2.1 Add central neutral-dark and arbitrary-accent canvas derivation using the existing color-mode conversion boundary; verify all six accents plus a synthetic custom color produce the specified greyish family in truecolor and valid nearest colors in 256-color mode.
- [ ] 2.2 Extend the bare-A1 damage-aware frame path to paint opaque row erases and terminal-default reset spans onto the selected canvas while preserving explicit component backgrounds; verify transparent frames remain byte-identical and full/differential frames, blank cells, nested resets, links, overlays, and dialogs retain correct ANSI and geometry.
- [ ] 2.3 Invalidate remembered presentation and force one complete repaint whenever the resolved canvas changes; verify transitions among transparent, accent, and dark, accent changes under each mode, scrolling, and resizing leave no stale cells.

## 3. Wire live lifecycle behavior

- [ ] 3.1 Add the narrow owned background settings port to bare-A1 composition and shell ownership, initialize it before the first frame, subscribe and dispose with the session, and verify settings-free and `a1 pi` compositions install no A1 canvas policy.
- [ ] 3.2 Preserve the active canvas through quit-outro painting and restore terminal-default background before alternate-screen exit and parent-terminal output; verify enabled/disabled outro, failure, and normal stop byte-order tests show no color flash or background leakage.
- [ ] 3.3 Add shell-frame integration coverage proving intentional selected-row, prompt, tool, search, panel, dialog, and extension backgrounds remain above both opaque canvas choices while ordinary cells use the selected canvas.

## 4. Validate the completed behavior

- [ ] 4.1 Run focused settings, theme, terminal-runtime, shell-frame, lifecycle, comparison-parity, architecture, typecheck, build, and strict OpenSpec validation; record implementation-specific results and any reviewed gap in `evidence/validation.md` without weakening assertions.
- [ ] 4.2 Perform build-first interactive truecolor review of transparent, every accent-derived background, fixed dark, live switching, resize/scroll, quit restoration, and `a1 pi` isolation; record the observed terminal and result in `evidence/validation.md`.
