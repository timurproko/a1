## Implementation summary

- Pending scalar rows render only their optimistic value until the owning backend supplies an authoritative stored/effective snapshot, preventing stale effective-state text from flashing.
- Successful scalar and structured edits create screen-local, user-action-ordered undo records. `Ctrl+Z` restores through the original backend, supports repeated reverse-order restoration, keeps failed restores retryable, and clears history with the screen.
- Settings list, value-menu, search, and generic structured-dialog input route `Ctrl+Z` to the same declared action. Enter is the sole Settings change key and Space is inactive. A central owned hint boundary rejects keyed actions beginning with connective `to` and consistently applies dim-key/muted-action roles to labels such as `Enter change`, `Ctrl+Z undo`, and `Esc close`.
- A structured panel supplies the sole upper boundary rule and consumes every pointer report. Generic panels show title, muted selected-part description, menu rows, concise hints, and bottom rule in that order.
- `modelThinkingLevels` uses a keyboard-only searchable two-step selector. Both steps retain the `Thinking Level` title with a muted inline step marker; the muted next line provides step instructions and selected-model context. Search uses the ASCII `> ` selector marker, selected arrows have one space before visible labels, provider suffixes remain muted, and hints advertise only active actions.
- Scalar value menus place their two mark cells before the source value column so choice text aligns with the setting value.
- Bare A1 omits Pi's redundant fullscreen wheel setting and runtime ownership in favor of the global owned scroll policy. It presents the unchanged `fullscreenCopyOnSelect` backend as `Copy on select`; the comparison profile retains Pi wording and behavior.

## Automated evidence

| Command | Result |
| --- | --- |
| `npx vitest run test/ui/components/shortcut-hints.test.ts test/ui/components/shortcuts.test.ts test/ui/components/dialog-panel.test.ts test/features/owned-ui/settings-app.test.ts test/repository-governance/shortcut-hint-governance.test.ts test/repository-governance/pi-modal-surface-inventory.test.ts` | 86 tests passed. Coverage includes centralized hint grammar and role enforcement, declaration-time rejection, compact and ordinary separators, dialog hierarchy and styling, searchable thinking steps, provider suffix styling, active hints, keyboard-only pointer ownership, undo behavior, and modal presentation governance. |
| `npx vitest run test/ui/components/prompt-input.test.ts test/ui/components/value-menu.test.ts` | 11 tests passed for the ASCII selector prompt override and value-menu text alignment. |
| `npx vitest run test/ui/settings/manager.test.ts test/repository-governance/terminal-architecture-policy.test.ts` | 58 tests passed for bare-A1 setting composition, comparison isolation, and architecture policy as part of the broader focused validation run. |
| `npx vitest run test/foundation/release/installer-bootstrap.test.ts test/foundation/release/restart-certification.test.ts` | 26 tests passed and 2 platform cases skipped when rerun after the full-suite timeout described below. |
| `npm run build` | Passed and produced the repository-checkout interactive candidate. |
| `npm run typecheck` | Passed for source and bin projects. |
| `npx openspec validate owned-ui-settings --strict && npx openspec validate ui-shortcuts --strict` | Both modified specifications passed strict validation. |
| `npx openspec validate --all --strict` | 33 items passed; the unrelated pre-existing `silent-installer` spec failed because its Purpose remains the generated placeholder. |
| `git diff --check` | Passed. |

The latest full `npm test` run completed 4,258 tests successfully and skipped 14, but exited nonzero after one unrelated five-second timeout in installer palette provenance. That file's 21 applicable tests passed immediately in a focused rerun (with its 2 platform cases skipped). An earlier full attempt also encountered a transient restart-certification timeout; its 5 tests passed in the focused rerun recorded above. No failure touched the changed Settings, dialog, composition, or shortcut surfaces.

## Manual handoff

Run the built bare-A1 candidate and open `/settings`. Confirm ordinary hints include `Enter change` but not Space, and that Space does not change a value. Open a scalar menu and confirm its choice text aligns with the source value column. Open `Warnings` and confirm the sole upper rule is followed by `Warnings`, the muted selected warning description, menu rows, concise hints, and the bottom rule. Open `Default thinking level per model` and confirm both steps retain `Thinking Level`, show muted `(step 1/2)` or `(step 2/2)` beside it, and place the step instruction on the next muted line. The model search marker should be ASCII `> `, selected-row arrows should have one space before their labels, provider suffixes should remain muted under selection, and pointer activity should not change either dialog.

Also change several scalar values: values should switch directly without a transient `(effective …)` string, and repeated `Ctrl+Z` should restore changes in reverse order. Verify undo while a scalar menu or search is open, then verify whole-value restoration from `Warnings`.

No implementation gap is known. Physical terminal review remains the maintainer handoff activity rather than automated evidence.
