## 1. Recompose Resume Session Chrome

- [x] 1.1 Split the selector's shared presentation state into semantic title/status and footer renderers; render the accent-bold stable `Resume Session` title plus the lower-case `Filter: current | all  Name: …  Sort: …` row, keep that row free of loading progress while partial results grow the existing paging total, and verify focused ANSI-role tests cover scope, name, sort, progressive discovery, and narrow widths.
- [x] 1.2 Place ordinary hints, delete confirmation, load errors, and transient mutation status below the session results with the shared content inset and immediate bottom-rule adjacency; verify focused selector tests cover row order, alignment, confirmation, status, and preserved search/rename/delete behavior.
- [x] 1.3 Update integrated session-shell workflow expectations for the stable title and changing filter row, and verify scope switching, selection, cancellation, and the explicit comparison profile remain unchanged.
- [x] 1.4 Recompose result rows into independently truncated title and aligned path/count/age columns, apply the Session Tree's `→` arrow, accent primary title, muted metadata, and subtle purple selection after fitting and padding the complete row, and verify focused tests cover exact selection roles, full-width highlights, and wide/narrow mixed-length column geometry.

## 2. Validate the Delivered Experience

- [x] 2.1 Run the focused Resume Session component and session-shell workflow tests plus permitted typecheck/build scopes, and record passing behavior and any explicit gap disposition in `evidence/validation.md`.
- [ ] 2.2 Build the interactive candidate and obtain maintainer physical terminal review that the title, stable filter/status row, progressive paging count, full-width selection, aligned result columns, content inset, and bottom hints match the requested modal presentation; record the result in `evidence/validation.md` before finalization.
