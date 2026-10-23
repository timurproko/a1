## Implementation

- Resident host retains primary-pointer ownership when a child-originated drag crosses a top or bottom tab strip and forwards strip motion/release at the nearest child edge row.
- Transcript selection maps an upward endpoint on pinned prompt chrome to the first visible content row while retaining the pointer column, so the top row selects from cursor to row end.
- Repeated edge-scroll ticks advance the semantic document-row endpoint even while the pointer remains on the same terminal cell, so every newly revealed row joins the active range.
- Focus loss clears resident child-drag ownership; strip-originated gestures remain owned by the resident tab surface.
- Copy of a visible transcript selection includes document rows past either viewport edge and the text beneath the jump-to-bottom control, so an upward drag auto-scrolled beyond one screen copies from the pointer row through the press anchor; paint stays clipped to visible rows.
- A downward content drag held below a detached viewport extends into the pointed dock row while auto-scroll keeps advancing; transcript rows scrolled past the top stay in the copy.
- During a held gesture, an endpoint whose row streaming restyled keeps its document row; only the moving head may first retain its live-tail distance, so the press anchor no longer drifts toward new output or clears the selection.

## Focused validation

- `npm run build:core` — passed.
- `npm run typecheck` — passed.
- `npx vitest run test/app/session-shell/session-shell-selection.test.ts test/ui/components/transcript-viewport.test.ts test/app/session-shell/session-viewport-controller.test.ts` — passed, 209 tests.
- `npx vitest run test/ui/components/ test/app/session-shell/` — passed 1296 of 1297; the one failure, `clipboard-packaged.test.ts`, timed out under parallel load and passed when rerun alone.
- `node scripts/governance/check-architecture.mjs` and `npm run check:code-documentation:changed` — passed after re-pinning `config/startup-graph-baseline.json`.
- `cargo fmt --check --manifest-path native/terminal-host/Cargo.toml` — passed.
- `npx --yes @fission-ai/openspec@1.8.0 validate fix-upward-selection-row --type change --strict --no-interactive` — passed.

Focused native test execution was attempted but the approved Windows workstation has neither Zig nor a recent trusted `terminal-vt-win32-x64` artifact. Exact native compilation and tests remain selected CI authority; this is a local evidence limitation, not a product gap.

## Known gaps

None.
