## 1. Owned selector presentation

- [ ] 1.1 Add a provenance-recorded bare-A1 thinking selector behind the component façade, preserving the pinned selector's search, focus, list, select, save-default, and cancel behavior; verify focused component interaction tests pass.
- [ ] 1.2 Render `Thinking Level` with bold semantic accent styling while preserving borders, spacing, and list geometry; verify semantic ANSI assertions distinguish accent-plus-bold from plain text.

## 2. Resolved shortcut integration

- [ ] 2.1 Pass the active editor profile's resolved thinking-cycle binding into the owned selector using shared platform-aware key formatting; verify default bare A1 renders `Ctrl+L`, never `Shift+Tab`, and explicit overrides render their effective keys.
- [ ] 2.2 Route only bare A1 through the owned selector and retain the public Pi selector for comparison mode; verify profile-isolation tests prove selector construction does not mutate either profile's dispatch bindings.

## 3. Regression validation and handoff

- [ ] 3.1 Run typechecking and focused component, shortcut, shell-workflow, and modal presentation suites; verify filtering, selection, default save, cancellation, focus restoration, default/custom hints, and heading styling all pass without running prohibited local full suites.
- [ ] 3.2 Build the candidate and prepare manual checks through `./scripts/dev` for `/thinking`, confirming the bold cyan/accent heading and `Ctrl+L` hint while preserving all selector actions; compare `./scripts/dev pi` for profile isolation and record any known gap.
