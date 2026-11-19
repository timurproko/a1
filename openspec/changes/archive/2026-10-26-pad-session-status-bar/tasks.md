# Tasks

## 1. Shared session footer inset

- [x] 1.1 Add a bare-A1 footer composition helper that reserves one terminal cell on each side and renders the selected footer against the remaining inner width.
- [x] 1.2 Bound built-in and extension-provided footer rows ANSI-safely inside the inner width while preserving row order, row count, invalidation, disposal, and selection geometry.
- [x] 1.3 Keep the explicit Pi comparison footer and non-footer extension surfaces unchanged.

## 2. Focused regressions

- [x] 2.1 Cover left and right spacing for the built-in path, usage/model, and merged extension-status rows.
- [x] 2.2 Cover every line of a multi-line extension-provided custom footer, including the reduced width passed to the plugin component.
- [x] 2.3 Cover narrow terminal widths, over-wide custom rows, ANSI safety, and comparison-profile isolation.

## 3. Completion evidence

- [x] 3.1 Run typecheck, focused session-shell tests, and strict OpenSpec validation; record outcomes and dispose of known gaps.
- [x] 3.2 Review the final diff for extension API changes, altered footer content or row order, comparison-profile drift, and selection or dock-geometry regressions.

## Evidence

- `npm run build:core` completed to generate the fresh worktree's build artifacts, then `npm run typecheck` passed.
- Focused session-shell, footer-link, resident-footer, and selection tests passed: 145 tests across 4 files.
- `npx --no-install openspec validate pad-session-status-bar --strict` passed.
- The CI-reported startup-graph overage was repaired by inlining the gutter path within the existing byte budget; `npm run check:architecture` passed without a baseline increase.
- Diff review found no extension API, footer content, row-order, or Pi comparison changes. Existing footer-link and selection regressions passed, and there are no known gaps.
