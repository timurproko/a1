## Implementation evidence

- `scripts/governance/ready-pull-request-refresh.mjs` classifies each freshly read pull request: only open, non-draft pull requests whose base is `develop` and whose base and head repositories are the governed repository are eligible. Drafts, closed requests, other bases, forks, and deleted head repositories are skipped; malformed numbers, draft state, or head SHAs fail visibly.
- Reconciliation pages the complete open `develop` set (bounded to ten pages of 100), then for each candidate re-reads the pull request and the current `develop` ref, compares `develop...head`, and skips heads that already contain the target. A stale head is updated through `PUT /pulls/{number}/update-branch` with `expected_head_sha` set to the SHA just compared.
- Update responses are bounded: `202` is `updated`, an expected-head mismatch is `deferred`, "no new commits" is `current`, a merge conflict is `blocked`, and any other status or message is `failed`. Conflicting, deferred, and per-candidate operational failures do not stop independent candidates; listing and pagination failures, and any `401`/`403`, abort the pass. The command reports every disposition to the log and step summary and exits non-zero when any candidate failed.
- `.github/workflows/ready-pull-request-refresh.yml` runs on merged `pull_request_target` close events into `develop` and on every `Documentation auto-merge` completion. It checks out only the default branch without persisted credentials, installs no dependencies, holds only `contents: read` for `GITHUB_TOKEN`, and serializes passes in the global non-cancelling `ready-pull-request-refresh` concurrency group.
- Branch updates use a short-lived `actions/create-github-app-token` token from the existing repository App, scoped to `contents: write` and `pull-requests: write`, passed only as `BRANCH_REFRESH_TOKEN`. The command never reads `GITHUB_TOKEN`, refuses a non-governed repository, and performs no push, merge, auto-merge, check, dispatch, or review call.
- The declarative inventory declares the workflow's triggers, permissions, default-branch source, concurrency, and `ready-pull-request-branch-refresh` authority. Workflow inspection reports `unscoped-branch-refresh` whenever the App token is missing, unscoped, or granted any other permission, so credential drift is detected.

## Focused validation

- `npx vitest run` over `ready-pull-request-refresh`, `github-repository-governance`, `merged-branch-cleanup`, `ci-release-runbook`, and `docs-sensitive-governance` tests — passed. The new suite covers classification of drafts, forks, closed, other-base, current, stale, and malformed candidates; merged-close refresh of multiple stale branches with draft, fork, current, and conflicting controls; duplicate-trigger idempotency; expected-head races; pagination and page bounds; malformed listings; per-candidate failures; credential aborts; App-token-only command behavior; workflow trigger, trust, concurrency, and authority shape; and inventory drift on token-scope changes.
- `npx tsgo -p tsconfig.json --noEmit` — passed. `tsconfig.bin.json` requires a prior `npm run build` for generated `dist` declarations and is unaffected by this change.
- Architecture, docs-sensitive governance, and code-documentation checks — passed.
- `node scripts/governance/check-github-repository-governance.mjs --check` — the only live difference is the new workflow's `state` (`missing` on GitHub until it is merged to `develop`).
- `npx openspec validate refresh-ready-prs-after-merge --strict` — passed.
- `git diff --check` — passed.

## Gap disposition

- The workflow only runs from the default branch, so no live branch refresh occurred during implementation. Task 3.3's live evidence of a real `develop` merge refreshing multiple ready pull requests, with draft and conflicting controls unchanged, can be recorded only after deployment.
- GitHub's update-branch messages are matched by stable phrases (`expected head sha`, `no new commits`, `conflict`); an unrecognized `422` fails visibly rather than being treated as success.
