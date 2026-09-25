## 1. Thinking-selector interaction

- [ ] 1.1 Stage the highlighted level as the desired default on Space and rebuild rows without closing or persisting; verify the `[default]` marker moves while active-level state and selection remain independent.
- [ ] 1.2 Save the staged default on Ctrl+S through the existing persistence callback; verify navigation after staging does not change the value being saved.
- [ ] 1.3 Close the bare selector only on Escape and prevent Ctrl+C from invoking cancellation; verify filtering, Enter selection, focus, and restoration remain intact.

## 2. Compact shortcut presentation

- [ ] 2.1 Render the exact semantic footer `Enter select  Space default  Ctrl+S save  Esc close`; verify ordering, concise wording, styling, width safety, and absence of `Escape/Ctrl+C`.
- [ ] 2.2 Preserve the pinned `a1 pi` comparison selector and update the source-port ledger only if its recorded owned deviation requires it.

## 3. Regression validation and handoff

- [ ] 3.1 Run typechecking, focused thinking-selector and shell-workflow tests, source-port governance checks, strict OpenSpec validation, and the build; record implementation evidence and dispose any known gaps.
- [ ] 3.2 Prepare manual `/thinking` review through `./scripts/dev`, verifying Space moves the default marker, Ctrl+S saves it, Ctrl+C stays open, Escape closes, and the compact footer matches Models.
