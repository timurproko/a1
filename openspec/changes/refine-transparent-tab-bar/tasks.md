## 1. Transparent strip styling

- [x] 1.1 Add canvas-aware inactive/control style helpers and verify truecolor and palette assertions distinguish transparent, black, and accent canvases.
- [x] 1.2 Make inactive tabs, overflow, and `+` inherit the transparent canvas at rest and use one accent-derived foreground hover treatment, verifying the active chip and every hit range remain unchanged.
- [x] 1.3 Refine all strip hover targets to reuse the owned menu accent-selected background while preserving their resting label foregrounds and unchanged hit geometry.
- [x] 1.4 Make `+` rest directly on Black and Accent canvases, and give `+` and the grouped right side one shared subtly lightened canvas hover while preserving Transparent behavior and stable foregrounds.
- [x] 1.5 Clear stale strip hover when tab creation/opening relocates `+`, requiring a fresh pointer event before the moved control can hover again.
- [x] 1.6 Make inactive tabs inherit the Accent canvas and its lighter hover while preserving current Black and Transparent inactive-tab treatments.

## 2. Grouped right-side interaction

- [x] 2.1 Replace separate Version and Time hover/hit identities with one rendered right-side group identity, verifying top, bottom, narrow, and single-item geometry.
- [x] 2.2 Apply one complete-group hover treatment and route its context action to the existing Right Side configuration surface, verifying every rendered group cell opens the same Configure flow.
- [x] 2.3 Pad the grouped hover/hit span by one cell on each side and replace the Version/Time gap with ` • ` while keeping the visible text alignment and constrained geometry valid.

## 3. Empty landing refinement

- [x] 3.1 Remove the package-version label from the empty landing while preserving wordmark and cwd placement, verifying the row below the cwd remains blank at both strip positions and constrained sizes.
- [x] 3.2 Replace the passive landing wordmark with a local Agent editor and status footer that preserves cwd placement, creates one Agent on non-empty Enter, and binds the draft submission to that exact pending tab.
- [x] 3.3 Cover Unicode editing, paste, empty submission, shortcuts, cancellation/failure, top/bottom placement, and constrained geometry without forwarding landing drafts to hidden or unrelated tabs.
- [x] 3.4 Echo a submitted landing draft immediately in the pending Agent's provisional content area with an empty editor, then hand off to the exact real Agent surface without changing deferred input delivery.
- [x] 3.5 Make the provisional submission use the final submitted-message row geometry and semantic styling, including prefix, projected background, text, stored submission time, configured time format, and narrow fallback.
- [x] 3.6 Place the provisional submitted-message row after the same leading breathing row as the first real prompt so startup handoff cannot shift it vertically.

## 4. Focused regression coverage

- [x] 4.1 Update native strip and landing regressions for transparent resting/hover bytes, palette fallback, grouped interaction, child isolation, and version-free landing geometry, and verify the focused terminal-host test target passes.
- [x] 4.2 Add truecolor and palette regressions proving strip hover backgrounds match owned popup menus without label recoloring, then rerun the focused terminal-host suites.
- [x] 4.3 Add regressions for padded right-side hover geometry, the bullet separator, and immediate pending-prompt content, then rerun the focused terminal-host suites.
- [x] 4.4 Add truecolor and palette regressions proving the provisional submitted-message row matches the final design at wide and constrained widths, then rerun the focused terminal-host suites.
- [x] 4.5 Add truecolor and palette regressions for canvas-resting `+` and shared lighter Black/Accent hover backgrounds, then rerun the focused terminal-host suites.
- [x] 4.6 Add regressions for relocated-control hover clearing and stable provisional-to-real prompt placement, then rerun the focused terminal-host suites.
- [x] 4.7 Add truecolor and palette regressions for Accent inactive-tab rest and hover without changing Black or Transparent, then rerun the focused strip suite.
