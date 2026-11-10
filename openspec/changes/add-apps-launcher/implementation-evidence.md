## Delivered outcomes

- Apps is a lazy, compact searchable chooser over the current application. Agent, Settings, and Changelog switching preserves the existing session/draft; cancel and same-app selection preserve focus/state. Leaving a rendered startup document uses its existing acknowledgement callback.
- Bare A1 removes Settings and Changelog from the Agent built-in catalogs while preserving application routes, startup What's New, and comparison commands. Cross-app Ctrl+P dispatch reads the effective Apps declaration. Ctrl+M opens floating Models without taking legacy Enter; thinking and queued-message defaults remain unchanged.
- Owned floating overlays paint their complete composed backdrop through one shared deterministic policy and use a raised opaque surface. Nested Settings configure dialogs consume the same palette/backdrop primitives. Narrow Apps and Models frames reduce optional spacing and visible choices before controls and guidance. Optional Apps/Models controllers remain off the eager startup graph.
- Successful picker, direct, and cycling model changes carry semantic model-change presentation metadata. Bare A1 suppresses only their redundant success notices; status/model/thinking state, warnings, failures, non-switch informational output, and comparison output remain available.

## Focused local checks

Local checks passed on the implementation working tree:

- `npm run build` and `npm run typecheck`.
- `check-architecture.mjs` and `check-pinned-pi-source-ledger.mjs`; ownership/startup limits remain enforced and size-ratchet changes only lower existing limits.
- Strict OpenSpec validation for `add-apps-launcher`.
- 298 tests across 18 explicitly selected files: Apps component/session switching, dialog coordinator, Models session behavior, workflow output, reference screens/startup acknowledgement, terminal host, session workflows, Models component geometry, prompt input/keybindings/help, pinned input parity, session presenters, overlay geometry, shared dialog rendering, Settings, route composition, workflow runner, and engine workflows.

These are bounded local observations, not exact-head CI or maintainer visual acceptance. The draft remains implementation-bound; readiness and broad validation belong to trusted workflow automation after every approved outcome is complete.

## Known gaps and disposition

- Legacy terminals cannot distinguish Ctrl+M from Enter. Preserve Enter; `/models` remains the documented fallback. This is the approved terminal-protocol limitation, not an unresolved shortcut rewrite.
- Frames too short to physically contain every control cannot display them all: the compact Apps form retains its essentials at four rows, and Models at eight rows. Ordinary narrow/resize geometry is covered without changing terminal dimensions.
- Visual review of the supplied reference style is optional and does not block completed implementation markers.
- The later requested footer `path (branch) • #900` is a pending scope refinement in this same draft, not implemented. Its unchecked PR outcome and detailed task remain open pending confirmation of the proposed format. Do not finalize this delivery while that scope remains pending.
