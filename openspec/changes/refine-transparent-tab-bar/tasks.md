## 1. Transparent strip styling

- [x] 1.1 Add canvas-aware inactive/control style helpers and verify truecolor and palette assertions distinguish transparent, black, and accent canvases.
- [x] 1.2 Make inactive tabs, overflow, and `+` inherit the transparent canvas at rest and use one accent-derived foreground hover treatment, verifying the active chip and every hit range remain unchanged.
- [ ] 1.3 Refine all strip hover targets to reuse the owned menu accent-selected background while preserving their resting label foregrounds and unchanged hit geometry.

## 2. Grouped right-side interaction

- [x] 2.1 Replace separate Version and Time hover/hit identities with one rendered right-side group identity, verifying top, bottom, narrow, and single-item geometry.
- [x] 2.2 Apply one complete-group hover treatment and route its context action to the existing Right Side configuration surface, verifying every rendered group cell opens the same Configure flow.

## 3. Empty landing refinement

- [x] 3.1 Remove the package-version label from the empty landing while preserving wordmark and cwd placement, verifying the row below the cwd remains blank at both strip positions and constrained sizes.
- [ ] 3.2 Replace the passive landing wordmark with a local Agent editor and status footer that preserves cwd placement, creates one Agent on non-empty Enter, and binds the draft submission to that exact pending tab.
- [ ] 3.3 Cover Unicode editing, paste, empty submission, shortcuts, cancellation/failure, top/bottom placement, and constrained geometry without forwarding landing drafts to hidden or unrelated tabs.

## 4. Focused regression coverage

- [x] 4.1 Update native strip and landing regressions for transparent resting/hover bytes, palette fallback, grouped interaction, child isolation, and version-free landing geometry, and verify the focused terminal-host test target passes.
- [ ] 4.2 Add truecolor and palette regressions proving strip hover backgrounds match owned popup menus without label recoloring, then rerun the focused terminal-host suites.
