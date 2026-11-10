## Delivered outcomes

- Apps is a lazy, compact searchable chooser over the current application. Agent, Settings, and Changelog switching preserves the existing session/draft; cancel and same-app selection preserve focus/state. Leaving a rendered startup document uses its existing acknowledgement callback.
- Bare A1 removes Settings and Changelog from the Agent built-in catalogs while preserving application routes, startup What's New, and comparison commands. Cross-app Ctrl+P dispatch reads the effective Apps declaration. Ctrl+M opens floating Models without taking legacy Enter; thinking and queued-message defaults remain unchanged.
- Owned floating overlays paint their complete composed backdrop through one shared deterministic policy and use a raised opaque surface. Nested Settings configure dialogs consume the same palette/backdrop primitives. Narrow Apps and Models frames reduce optional spacing and visible choices before controls and guidance. Optional Apps/Models controllers remain off the eager startup graph.
- Successful picker, direct, and cycling model changes carry semantic model-change presentation metadata. Bare A1 suppresses only their redundant success notices; status/model/thinking state, warnings, failures, non-switch informational output, and comparison output remain available.
- The first footer row now renders `path (branch) • #900`: the separator is dim and outside the PR hyperlink. Constrained widths preserve a complete badge before the path, omit a dangling separator when only the badge fits, and use a safe dim ellipsis when even the badge cannot fit. No-PR and comparison presentation remain unchanged.

## Focused local checks

Local checks passed on the implementation working tree:

- `npm run build` and `npm run typecheck`.
- `check-architecture.mjs` and `check-pinned-pi-source-ledger.mjs`; ownership/startup limits remain enforced and size-ratchet changes only lower existing limits.
- Strict OpenSpec validation for `add-apps-launcher`.
- The original implementation passed 298 tests across 18 explicitly selected files: Apps component/session switching, dialog coordinator, Models session behavior, workflow output, reference screens/startup acknowledgement, terminal host, session workflows, Models component geometry, prompt input/keybindings/help, pinned input parity, session presenters, overlay geometry, shared dialog rendering, Settings, route composition, workflow runner, and engine workflows.
- The footer refinement passed 36 prompt-input/footer tests plus 30 session link/hover tests. Assertions cover the dim separator, exact hyperlink boundaries, absent PRs, several PR-number lengths across widths zero through seventy, path-first clipping, tiny-width ellipses, comparison isolation, and terminal-level repository/footer propagation.

These are bounded local observations, not exact-head CI or maintainer visual acceptance. The draft remains implementation-bound; readiness and broad validation belong to trusted workflow automation once the final implementation marker is checked after current-target reconciliation and body validation.

## Known gaps

No known implementation gaps within the approved scope. The following constraints are explicitly dispositioned:

- Legacy terminals cannot distinguish Ctrl+M from Enter. Preserve Enter; `/models` remains the documented fallback. This is the approved terminal-protocol limitation, not an unresolved shortcut rewrite.
- Frames too short to physically contain every control cannot display them all: the compact Apps form retains its essentials at four rows, and Models at eight rows. Ordinary narrow/resize geometry is covered without changing terminal dimensions.
- Visual review of the supplied reference style is optional and does not block completed implementation markers.
- The requested footer separator is implemented and covered by focused component and session-level tests; no pending scope refinement remains.
