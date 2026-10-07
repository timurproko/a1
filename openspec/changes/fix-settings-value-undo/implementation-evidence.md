## Implementation summary

- Pending scalar rows now render only their optimistic value until the owning backend supplies an authoritative stored/effective snapshot, preventing the stale effective-state suffix from flashing.
- Successful scalar and structured edits create screen-local, user-action-ordered undo records. `Ctrl+Z` restores through the original backend, supports repeated reverse-order restoration, keeps failed restores retryable, and clears history with the screen.
- Settings list, value-menu, search, and structured-dialog input all route `Ctrl+Z` to the same declared action. Main and structured footers derive `Ctrl+Z to undo` from their shortcut declarations.

## Automated evidence

| Command | Result |
| --- | --- |
| `npx vitest run test/features/owned-ui/settings-app.test.ts` | 53 tests passed. Coverage includes unresolved-value presentation, A1 and agent scalar restoration, repeated reverse order, menu/search dispatch, structured whole-value restoration, failed forward writes, failed restore retry, history reset, and both shortcut hints. |
| `npx vitest run test/repository-governance/shortcut-hint-governance.test.ts test/repository-governance/owned-settings-interaction-boundary.test.ts` | 7 tests passed across shortcut conflict/hint governance and the owned Settings interaction boundary. |
| `npm run build` | Passed and produced the repository-checkout interactive candidate. |
| `npm run typecheck` | Passed after the build supplied the generated `dist` declarations required by the bin project. |
| `npx openspec validate fix-settings-value-undo --strict` | Passed. |
| `git diff --check` | Passed. |

The first focused-test attempt occurred before this worktree had dependencies installed and stopped during global setup because its local `node_modules` was absent; `npm install --ignore-scripts` supplied the lockfile-pinned dependencies without tracked changes. An initial pre-build typecheck passed the source project but the bin project could not resolve generated `dist` declarations; the recorded post-build typecheck passed both projects.

## Manual handoff

Run the built bare-A1 candidate, open `/settings`, and change several scalar values. Values should switch directly without a transient `(effective …)` string; the footer should include `Ctrl+Z to undo`; repeated `Ctrl+Z` should restore changes in reverse order. Also verify undo while a scalar menu or search is open, and toggle a `Warnings` part to verify the structured dialog shows and restores the whole prior value.

No implementation gap is known. Physical terminal review remains the maintainer handoff activity rather than automated evidence.
