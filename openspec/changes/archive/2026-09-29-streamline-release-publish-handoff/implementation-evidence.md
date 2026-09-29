## Implementation evidence

- The stable command now holds one source-bound draft review session, waits across GitHub's one-second timestamp precision for a distinguishable fresh **Save draft**, rejects source/draft drift, dispatches one authenticated repository event, verifies the correlated default-branch run, and waits for its result. Exact successful staging receipts are resumable without package or workflow mutation.
- `.github/workflows/approve-release.yml` now receives only `repository_dispatch`, authenticates the human sender, independently derives the source/version/body/Release identity, and calls the unchanged trusted npm publisher. Payload fields locate and correlate the candidate but grant no authority.
- Stable `publish.yml` completion now stops after exact package publication and published-pair checks, draft asset upload, `master` fast-forward, unchanged draft/tag checks, and a bounded staging receipt. It no longer publishes the Release or prepares reopening.
- `.github/workflows/finalize-release.yml` handles `release.published` without npm authority. It verifies both authorized humans, the successful staging run, normalized body digest, exact npm pair and `latest` tags, downloaded asset digest, `master`, Release, and GitHub-created tag before calling the existing exact reopening implementation.
- Receipt contracts reject failed/wrong workflow runs, actor drift, run-attempt drift, draft or changed Releases, duplicate receipt assets, moved tags, changed `master`, package/tag drift, and changed assets. Existing reopening coverage still rejects incompatible or auto-merged work.
- Product release-note generation, package overlay, startup acknowledgement, preview suppression, bare A1 newest-first history, and `a1 pi` oldest-first history were not changed.

## Focused validation

- `npm run build` — passed.
- `npm run typecheck` — passed after the build supplied the generated `dist` declarations required by `tsconfig.bin.json`.
- Eight focused release/governance files — passed, 127 tests; the subsequently added cancellation case also passed in isolation. Coverage included release targets, approval identity, dispatch/run binding, staging receipts, disposable-Git release coordination, pipeline policy, runbook policy, and repository governance.
- `npx openspec validate streamline-release-publish-handoff --strict` — passed.
- YAML parsing for `approve-release.yml`, `publish.yml`, and `finalize-release.yml` — passed.
- Architecture, docs-sensitive governance, and release-documentation governance checks — passed.
- `git diff --check` — passed before evidence completion.

## Gap disposition

- No live stable package, GitHub Release, tag, `master` update, or reopening PR was created during implementation. Exact external execution remains intentionally deferred to the post-merge release operation.
- GitHub cannot disable native **Publish release** before npm readiness. Premature use is detected by final verification but cannot be repaired automatically; command output and maintainer documentation make the safe Save/wait/refresh/Publish sequence explicit.
- Defender-dependent exact-package startup evidence is intentionally left to protected Windows CI. No active-workstation terminal or browser automation was performed.
