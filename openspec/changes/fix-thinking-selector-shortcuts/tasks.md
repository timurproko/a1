## 1. Thinking-selector interaction

- [x] 1.1 Stage the highlighted level as the desired default on Space and rebuild rows without closing or persisting; verify the `[default]` marker moves while active-level state and selection remain independent.
- [x] 1.2 Save the staged default on Ctrl+S through the existing persistence callback; verify navigation after staging does not change the value being saved.
- [x] 1.3 Close the bare selector only on Escape and prevent Ctrl+C from invoking cancellation; verify filtering, Enter selection, focus, and restoration remain intact.

## 2. Compact shortcut presentation

- [x] 2.1 Render the exact semantic footer `Enter select  Space default  Ctrl+S save  Esc close`; verify ordering, concise wording, styling, width safety, and absence of `Escape/Ctrl+C`.
- [x] 2.2 Preserve the pinned `a1 pi` comparison selector and update the source-port ledger for the new owned-control deviation.

## 3. Regression validation and handoff

- [x] 3.1 Run typechecking, the focused thinking-selector and shell-workflow tests, source-port governance checks, strict OpenSpec validation, and the available TypeScript build stages; record the local native-build environment blocker and dispose implementation gaps.
- [x] 3.2 Prepare manual `/thinking` review through `./scripts/dev`; focused component and shell assertions cover Space staging, Ctrl+S persistence routing, Ctrl+C staying open, Escape closing, and the compact Models-style footer before terminal review.
