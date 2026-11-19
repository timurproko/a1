# Implementation evidence

Commands were run from `C:/git/a1/.worktrees/retain-merged-pr-footer` on Windows with Node v24.21.0. The worktree initially had no local dependencies, so the first focused-test and typecheck attempts stopped on missing `node_modules`/`dist`; `npm ci --ignore-scripts` installed the exact lockfile dependencies and every recorded validation below then passed. `test:fast`, `test:full`, and `test:release` were not run because the maintainer did not request them.

## Behavior evidence

- Branch PR parsing normalizes exact `OPEN` and `MERGED` payloads to the same number and canonical URL while continuing to reject `CLOSED`, branch mismatches, invalid numbers, and unsafe URLs.
- Runtime lifecycle coverage changes an associated session from its linked branch to an unrelated worktree/branch whose probe returns no PR and verifies the previous identity is cleared before startup-context discovery resumes.
- The built discovery function was exercised against retained merged PR #552 and returned `{"number":552,"url":"https://github.com/timurproko/a1/pull/552"}`. The same invocation against the unrelated primary `develop` checkout returned `null`.
- The deterministic manual footer fixture now reports `MERGED`, allowing the existing bare-A1 footer preview to exercise post-merge badge rendering without changing visible badge presentation.

## Validation

| Command | Outcome |
| --- | --- |
| `npx openspec validate retain-merged-pr-footer --strict --no-interactive` | Valid. |
| `npm run build` | Passed; generated artifacts remained unchanged. |
| `npm run typecheck` | Passed for source and bin projects. |
| `npm run check:architecture` | Passed architecture, product/package identity, pinned Pi source ledger, and terminal host provenance checks. |
| `npx vitest run test/integrations/pi/engine/repository-pr.test.ts test/integrations/pi/engine/session-runtime.test.ts` | 18 tests passed in 2 files. |
| Built `readPullRequest` live probe against merged PR #552 and unrelated `develop` | Returned #552 for its retained worktree and `null` for `develop`. |

## Known gaps

- Interactive footer review remains for maintainer acceptance. No implementation gap is known; the badge presentation itself is unchanged.
