## 1. Owned selector presentation

- [x] 1.1 Add a provenance-recorded bare-A1 thinking selector behind the component façade, preserving the pinned selector's search, focus, list, select, save-default, and cancel behavior; verify focused component interaction tests pass.
- [x] 1.2 Render `Thinking Level` with bold semantic accent styling, keep descriptions inline and muted on selected and unselected rows, and place one success-green active checkmark without a duplicate detail row; verify row order, occurrence count, and semantic ANSI roles.
- [x] 1.3 Align descriptions one separator after the widest rendered primary label, place the active checkmark directly after its level name, and suppress the footer's duplicate level only while the selector is open; verify columns, marker order, non-duplication, and footer restoration.
- [x] 1.4 Collapse duplicate available levels to one row and render the resolved cycle hint in muted grey immediately below the title; verify row uniqueness, adjacency, and semantic styling.

## 2. Resolved shortcut integration

- [x] 2.1 Pass the active editor profile's resolved thinking-cycle binding into the owned selector using shared platform-aware key formatting; verify default bare A1 renders `Ctrl+L`, never `Shift+Tab`, and explicit overrides render their effective keys.
- [x] 2.2 Route only bare A1 through the owned selector and retain the public Pi selector for comparison mode; verify profile-isolation tests prove selector construction does not mutate either profile's dispatch bindings.

## 3. Regression validation and handoff

- [x] 3.1 Run typechecking and focused component, shortcut, shell-workflow, and modal presentation suites; verify filtering, selection, default save, cancellation, focus restoration, default/custom hints, heading styling, aligned muted descriptions, adjacent active marker, footer restoration, and non-duplication all pass without running prohibited local full suites.
- [x] 3.2 Build the candidate and prepare manual checks through `./scripts/dev` for `/thinking`, confirming the bold cyan/accent heading, `Ctrl+L` hint, aligned grey descriptions, one adjacent green active checkmark, and no duplicate footer level while preserving all selector actions; compare `./scripts/dev pi` for profile isolation and record any known gap.
