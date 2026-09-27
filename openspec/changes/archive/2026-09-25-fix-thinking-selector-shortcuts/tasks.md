## 1. Fixed thinking-state geometry

- [ ] 1.1 Pad every level through the widest available name and reserve fixed active/default marker slots; verify `[default]` and every description remain at stable columns for each possible default level.
- [ ] 1.2 Preserve active/default independence, filtering selection, semantic marker colors, and narrow-width safety with the fixed grid.

## 2. Immediate default persistence

- [ ] 2.1 Add a settings-only engine boundary that persists the global default without changing the active session level.
- [ ] 2.2 Make Space move and persist the default immediately while leaving the selector open; verify no staged or unsaved state remains.
- [ ] 2.3 Remove Ctrl+S handling and render the exact semantic footer `Enter select  Space default  Esc close`; preserve Ctrl+C retention and Escape close.
- [ ] 2.4 Preserve the pinned `a1 pi` selector and update source-port evidence for the refined owned controls.

## 3. Regression validation and handoff

- [ ] 3.1 Run typechecking, focused component, shell-workflow, and engine tests, source-port governance checks, strict OpenSpec validation, and the available build stages; record evidence and dispose implementation gaps.
- [ ] 3.2 Prepare manual `/thinking` review through `./scripts/dev`, verifying stable marker/description columns, immediate persistence without active-level change, no unsaved state, and the reduced footer.
