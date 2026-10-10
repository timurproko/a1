# Manual 2×2 terminal-host basic result

## Exact artifact

- Recorded at: `2026-08-14T16:13:20.217Z`
- Source commit: `aeb7421ff5cc82bc5da04cfb0d356e8f8041b6cb`
- Artifact: `native/terminal-host/target/debug/addone-terminal-host.exe`
- SHA-256: `896e1b5d2e2730dfd8e591fe3bd565a2aa283fb3ec6f64e8345745c6afcf024d`
- Size: 2,367,488 bytes
- Invocation: user-controlled `npm run proof:terminal-host`
- Surface: one existing outer terminal, one fixed tab, four independently PTY-backed Pi sessions

## User-reported result

The user manually confirmed all of the following against the exact artifact:

- all four panes launched Pi;
- the four-pane presentation worked without observed flicker;
- pane focus and input routing worked;
- changing or clicking the focused pane preserved content in every pane after the repaint correction.

The user accepted this basic multi-pane proof result.

## Explicit product disposition

The fixed 2×2 grid and dashed pane outlines are disposable proof scaffolding, not an accepted production layout or UI design. This result proves the native multi-pane pipeline only. It does not approve carrying the fixed geometry, border treatment, or proof interaction model into the product.

Production tabs and panes are expected later to use authoritative arbitrary layouts selected through the AddOne UI. The proof implementation may be removed or replaced after the exact-artifact 2×2 gate is finished; it must not become the default production workspace by inertia.

## Gate scope

This record does not complete the formal tasks 5.3–5.6 acceptance gate. High-rate output, broader terminal modes and interactions, resize/terminal-size measurements, resource observations, abnormal exits, isolated-worker requirements, and the final stop/go decision remain separately required. No automated physical terminal control was performed on the active workstation.
