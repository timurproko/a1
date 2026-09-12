## 1. Make merge-state decisions explicit

- [x] 1.1 Extend the documentation auto-merge planner and declaration with positive mergeability and explicit clean/unstable/blocked/unknown/conflicting decisions; verify planner tests require current-head successful validation for direct merges and preserve pending-validation arming and failed/stale validation refusal.
- [x] 1.2 Apply the same expected-SHA protected squash reconciliation to armed and unarmed eligible heads; verify manager tests cover validated unstable and clean heads, no merge on unconfirmed/conflicting mergeability, and synchronous cleanup only after confirmed integration.

## 2. Recover the specific arming race safely

- [x] 2.1 Preserve structured GraphQL errors and recognize only the unstable-status enable rejection; verify fake-GitHub tests reproduce the observed UNPROCESSABLE error and keep authentication, permissions, malformed responses, mixed error sets, transport failures, and unrelated GraphQL errors fatal.
- [x] 2.2 Add bounded refresh/re-evaluation after recognized state rejection using the existing reconciliation budget; verify tests for blocked-to-unstable recovery, bounded deferral, accurate summaries, and refreshed head/draft/base/repository/complete-diff eligibility without reusing stale validation.
- [x] 2.3 Share concurrent-merge confirmation and refusal handling across recovery paths; verify same-expected-head concurrent merge permits idempotent cleanup, whereas changed heads, close-without-merge, and protected merge refusal never cause branch deletion or bypass.

## 3. Validate and recover the live documentation path

- [ ] 3.1 Complete the fake-GitHub regression matrix and preserve existing exact-allowlist, both-side rename, trusted workflow, disable-on-ineligibility, and exact-head cleanup coverage; verify the focused governance tests and required implementation CI pass without workflow-permission or repository-policy changes.
- [ ] 3.2 Provide the exact implementation commit and focused fake-GitHub test command for maintainer acceptance; verify acceptance and explicit merge authorization are recorded before the code PR integrates.
- [ ] 3.3 After accepted code reaches the trusted default branch, reconcile #316 if still open or an isolated eligible documentation PR using a current-head validation-completion event; verify recorded workflow outcome, expected validated SHA, automatic protected squash merge, and absence of the unchanged remote head ref before claiming live recovery complete.
