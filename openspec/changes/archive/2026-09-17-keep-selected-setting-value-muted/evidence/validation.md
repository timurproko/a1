# Implementation Validation Evidence

Recorded: 2026-09-17T11:20:00Z

## Regression baseline

Against the planning base, the new list-view assertions failed as expected: the selected row rendered its value as `<accent>light</accent>`, so "carries the selection on the cursor and label only" and "paints a selected value exactly like an unselected one" both failed (2 of 4). The pinned parity test previously asserted whole-row byte equality including the accent value, which is what forced the accent back the last time the presentation was corrected.

## Passing evidence

- List-view component (4 tests): the selected row paints `→ ` and the label in the accent, its value in the muted role, and never the value in the accent; the value segment of a selected row equals the unselected row's byte for byte both at rest (muted) and under the pointer (unpainted).
- Settings screen (33 tests): rendered through a naming theme, the selected `Scrollbar mode` row shows `<accent>` on the label and `<muted>auto</muted>` on the value while the unselected `Scrollbar style` row shows only a muted value; a pointer motion report over the selected value brightens it to plain text with no muted or accent role while the label keeps the accent. All prior screen assertions remain green.
- Pinned settings presentation parity (8 tests, truecolor and 256color at 28, 40, and 72 columns): the unselected row is byte-identical to pinned Pi; the selected row becomes byte-identical when, and only when, the muted role is painted as the accent, so no other drift exists on either side; the owned selected row contains the muted value and not the accent value, the pinned row contains the accent value, and raw terminal parity holds for the shared bytes. The 72-column bound check uses the same substitution.
- Combined ui components, owned-ui features, and repository-governance run: 1429 of 1433 tests passed; the four failures (code documentation source roles, graceful quit process boundary, terminal-core architecture policy, release command) exceeded their budgets under parallel load and all four passed when rerun alone (timing, unrelated).
- TypeScript project typecheck, architecture, naming, code-documentation, and docs governance: passed with the provenance baseline and UI reference provenance updated to name the selected-value difference.

## Physical acceptance

The user ran the rebuilt candidate through `./scripts/dev` on Windows (Git Bash) and confirmed the selected row shows the accent label with a grey value that brightens under the pointer, reporting "tested approve".

## Gap disposition

No known implementation or validation gaps remain. Full regression and native host gates remain CI-owned under repository policy.
