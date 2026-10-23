## Implementation

- Resident host retains primary-pointer ownership when a child-originated drag crosses a top or bottom tab strip and forwards strip motion/release at the nearest child edge row.
- Transcript selection maps an upward endpoint on pinned prompt chrome to the first visible content row while retaining the pointer column, so the top row selects from cursor to row end.
- Repeated edge-scroll ticks advance the semantic document-row endpoint even while the pointer remains on the same terminal cell, so every newly revealed row joins the active range.
- Focus loss clears resident child-drag ownership; strip-originated gestures remain owned by the resident tab surface.

## Focused validation

- `npm run build:core` — passed.
- `npm run typecheck` — passed.
- `npx vitest run test/app/session-shell/session-shell-selection.test.ts test/ui/components/transcript-viewport.test.ts test/app/session-shell/session-viewport-controller.test.ts` — passed, 209 tests.
- `cargo fmt --check --manifest-path native/terminal-host/Cargo.toml` — passed.
- `npx --yes @fission-ai/openspec@1.8.0 validate fix-upward-selection-row --type change --strict --no-interactive` — passed.

Focused native test execution was attempted but the approved Windows workstation has neither Zig nor a recent trusted `terminal-vt-win32-x64` artifact. Exact native compilation and tests remain selected CI authority; this is a local evidence limitation, not a product gap.

## Known gaps

None.
