# Implementation evidence

## Pre-implementation incident

- Development publication: [run 36329487925](https://github.com/timurproko/a1/actions/runs/36329487925), source `040ba369494e17439cb33bbbc80bba958a4e1df2`, version `0.2.1-dev.599`.
- Exact package validation passed on Windows Node 24, Linux Node 24, and macOS Node 24.
- Publish job `108650252531` succeeded: the installer upload was correctly skipped because its exact bytes already existed, the application was published by GitHub Actions, and registry verification passed for both identities and `next` tags.
- Required `Published pair / ${{ matrix.label }}` job `108650799066` was skipped, `Complete release records` was skipped, and aggregate job `108650799095` failed because `POST_PUBLISH` and `COMPLETE` were not successful.
- Registry inspection confirmed both `@timurproko/a1@0.2.1-dev.599` and `@timurproko/a1-install@0.2.1-dev.599` exist under `next`. These immutable bytes are published but the run remains incomplete evidence.

## Planning diagnosis

Development mode intentionally skips the full documentation review. The publish job uses `always()` and explicit allowed-skip/result checks, so it ran successfully. `post_publish` and `complete` use ordinary conditions without `always()`, allowing GitHub's upstream skipped status to suppress them before their direct-success predicates can establish eligibility. The aggregate correctly refused to turn those skips into success.

## Implementation results

The maintainer approved implementation in the same draft PR. The corrective workflow now always evaluates `post_publish` while requiring successful direct `plan`, `package`, and `publish` dependencies, selected work, and at least one package build. `complete` likewise always evaluates while requiring successful direct `plan`, `package`, `publish`, and `post_publish` dependencies. A failed, cancelled, or skipped direct prerequisite therefore remains fail-closed; only the implicit propagation from an allowed transitive skip is bypassed.

Focused policy coverage isolates all three downstream job blocks and binds their exact conditions. It also requires partial-pair planning to remain active when either the application or installer is absent, including the `.599` incident shape where the installer already existed and the application still required publication. Existing aggregate assertions continue to require `PUBLISH`, `POST_PUBLISH`, and `COMPLETE` success. The workflow diff changes no trigger, matrix, package, credential, npm tag, stable mutation step, or aggregate command. One pre-existing multiline assertion was made CRLF/LF portable so the focused test runs on the Windows maintainer environment.

Validation on the implementation worktree:

- `npm ci` — passed; lifecycle build completed. npm reported two moderate dependency audit advisories and the repository environment check noted that `gh` is not on `PATH`; neither changes candidate behavior or test outcomes.
- `npx vitest run test/repository-governance/release-pipeline-policy.test.ts` — passed, 13 tests.
- `npm run typecheck` — passed.
- `npm run check:code-documentation:changed` — passed with no violations.
- `node D:/Git/a1/node_modules/@fission-ai/openspec/bin/openspec.js validate fix-publication-post-publish-skip --strict` — passed.
- `git diff --check` — passed.

Per repository policy, no local full or release suite was run. Current `origin/develop` remained `040ba369494e17439cb33bbbc80bba958a4e1df2` when implementation began, so the approved base required no reconciliation merge.

## Known gaps

- A pull request cannot safely publish npm artifacts. Live proof that the corrected conditions execute `post_publish` and `complete` remains an explicit post-merge requirement for the new numbered development candidate; this is an operational gate, not a claim that PR tests exercised npm publication.
- Run `36329487925` and version `.599` remain immutable and are not retroactively repaired by this change. The development installer is not declared fully proven until the new candidate's publication, native published-pair smoke lanes, completion, and aggregate all succeed.
