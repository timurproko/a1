## Context

Development run `36329487925` selected source `040ba369494e17439cb33bbbc80bba958a4e1df2` and version `0.2.1-dev.599`. Package acquisition and Windows, Linux, and macOS validation succeeded. The publish job succeeded: it verified the already bootstrapped installer bytes, published the application through GitHub Actions, and verified both registry packages and `next` tags.

The `post_publish` job was skipped, followed by skipped `complete`, because their ordinary job-level conditions did not use `always()`. The development-mode documentation review is intentionally skipped. GitHub's dependency status propagation can therefore suppress a downstream job even when its direct package and publish dependencies succeeded through their own explicit allowed-skip conditions. The `result` aggregate correctly required `post_publish` and `complete` success and failed.

Registry inspection confirms both `.599` packages exist with the expected versions and `next` tags. This is not an npm authentication or package-byte failure. The missing evidence is the isolated published-pair smoke matrix and successful completion outcome.

## Goals / Non-Goals

**Goals:**

- Run required published-pair smoke lanes after successful publication even when an upstream documentation job was intentionally skipped for development mode.
- Keep downstream execution fail-closed on unsuccessful, cancelled, or skipped direct prerequisites.
- Preserve the aggregate's requirement for publication, post-publication smoke, and completion success.
- Obtain a fully successful new development publication after the correction merges.

**Non-Goals:**

- No reinterpretation, rerun, republish, deletion, or mutation of immutable `.599` package bytes.
- No weakening of the native validation or published-pair matrices.
- No change to OIDC, trusted-publisher configuration, npm tags, release naming, stable release records, or workflow display name.
- No automatic publication from a push; explicit development dispatch and nightly authority remain unchanged.

## Decisions

### 1. Evaluate downstream jobs explicitly and fail closed

Add `always()` to the `post_publish` job condition, followed by explicit requirements that `plan`, `package`, and `publish` all concluded `success`, that work is selected, and that at least one package needed publication. This bypasses only GitHub's implicit skip propagation. It does not permit a failed, cancelled, or skipped direct prerequisite.

Apply the same pattern to `complete`: require `plan`, `package`, `publish`, and `post_publish` success explicitly, plus the existing work/build selection. Stable record steps remain channel-gated exactly as before. For development publication, the completion job may contain no stable-only mutation but must still report success so the aggregate can prove the required chain completed.

Adding only `always()` without result checks is rejected because it could run smoke or completion after a real prerequisite failure. Removing the aggregate requirement is rejected because it would turn missing post-publication evidence into success.

### 2. Bind policy tests to each required condition

Extend the release-pipeline policy test to isolate the `post_publish` and `complete` job blocks and assert their complete conditions. The test must require `always()` and every direct success result, not merely search for one token anywhere in the workflow. Retain existing assertions that the aggregate requires `PUBLISH`, `POST_PUBLISH`, and `COMPLETE` success.

The regression is static workflow-policy evidence because GitHub's skip semantics are not safely reproduced by running the production workflow from a pull request. Exact behavior is then proven by the first newly numbered development publication after merge.

### 3. Treat `.599` as published but incomplete operational evidence

Do not move, overwrite, or unpublish `.599`. Its registry bytes were validated and are immutable, but run `36329487925` remains failed because required published-pair smoke did not execute. The corrective merge creates a new authoritative `develop` commit and therefore a new numbered preview. That new candidate must pass package validation, OIDC publication, all published-pair smoke lanes, completion, and the publication aggregate before the installer development channel is considered fully proven.

A manual `npm run develop` against the unchanged `.599` source is an early no-op because both versions exist; it cannot manufacture the missing smoke evidence and is not a repair strategy.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Policy | Focused test requires `always()` plus explicit successful direct prerequisites on `post_publish` and `complete` |
| Fail closed | Conditions reject failed, cancelled, or skipped package/publish/post-publish dependencies |
| Aggregate | Publication result still requires publish, post-publish, and completion success |
| PR | Required exact-head CI validates the workflow and governance change without executing untrusted publication |
| Post-merge | New development run publishes/verifies one candidate and executes Windows, Linux, and macOS published-pair smoke lanes |
| Registry safety | `.599` remains immutable; no retry claims its failed aggregate became successful |

## Risks / Trade-offs

- **`always()` could allow unsafe downstream execution.** Pair it with exact direct dependency success checks and preserve work/build selection.
- **Static tests can drift from GitHub semantics.** Require a successful newly numbered live development publication after merge.
- **A new preview advances `next` beyond `.599`.** This is intended; immutable `.599` remains available by exact version while the corrected candidate becomes the proven development channel.
- **Completion has no development mutation steps.** Keep the job as explicit evidence that the required chain reached completion; do not weaken the aggregate to accept a skip.

## Migration Plan

1. After explicit plan approval and implementation request, continue in this worktree, branch, and draft PR.
2. Add focused workflow-policy assertions, then update downstream job conditions with explicit successful prerequisites.
3. Complete focused evidence, acceptance scenarios, trusted finalization, and exact-head PR CI before manual merge.
4. After authorized manual merge, run `npm run develop` once for the new corrective PR number and require package validation, publication, all published-pair lanes, completion, and aggregate success.

No package or data migration is required. Rollback reverts the workflow condition change in a later PR; it must not alter existing npm versions or tags by hand.
