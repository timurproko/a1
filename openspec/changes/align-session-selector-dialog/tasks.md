## 1. Recompose Resume Session Chrome

- [ ] 1.1 Split the selector's shared presentation state into semantic title/status and footer renderers; render the accent-bold stable `Resume Session` title plus the lower-case `Filter: current folder | all  Name: …  Sort: …` row, and verify focused ANSI-role tests cover scope, name, sort, loading, and narrow widths.
- [ ] 1.2 Place ordinary hints, delete confirmation, load errors, and transient mutation status below the session results with the shared content inset and immediate bottom-rule adjacency; verify focused selector tests cover row order, alignment, confirmation, status, and preserved search/rename/delete behavior.
- [ ] 1.3 Update integrated session-shell workflow expectations for the stable title and changing filter row, and verify scope switching, selection, cancellation, and the explicit comparison profile remain unchanged.

## 2. Validate the Delivered Experience

- [ ] 2.1 Run the focused Resume Session component and session-shell workflow tests plus permitted typecheck/build scopes, and record passing behavior and any explicit gap disposition in `evidence/validation.md`.
- [ ] 2.2 Build the interactive candidate and obtain maintainer physical terminal review that the title, filter/status row, content inset, and bottom hints align with Session Tree and other modals; record the result in `evidence/validation.md` before finalization.
