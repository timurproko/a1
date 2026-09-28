## Context

Manual stable run `36388284997` selected authoritative source `bb2aa9aee054c7612ba453c96456a7e75650da24`, stamped and packed candidate `0.2.1`, and passed documentation review, all process-guardian builds, and candidate acquisition. Complete exact-package validation then failed on all four lanes, so publish, published-pair smoke, completion, tag, GitHub Release, and `master` movement were skipped.

The complete logs isolate three causes:

1. Linux, macOS, Windows Node 22, and Windows Node 24 all failed `release-target.test.ts`. PRs #607 and #608 intentionally reduced the root README to concise commands, but the test and canonical requirement still demand detailed reopening prose such as `0.1.9-dev`, target-error explanation, and manual merge wording in both README and runbook. The runbook still contains all of that operator guidance.
2. macOS additionally failed two `project-trust-preflight.test.ts` assertions because `mkdtemp` returned lexical `/var/...` while production correctly canonicalized the trust identity to `/private/var/...`. The canonical trust requirement explicitly covers native macOS temporary aliases; the test expected lexical labels/persistence paths while the prompt heading correctly remained lexical.
3. Windows Node 22 additionally passed the assertions in `does not advertise a persistent-but-unwritten new session as resumable`, then failed suite teardown while recursively removing its temporary root with `EBUSY`. Windows Node 24 passed the same runtime test. The previous #597 NUL-cleanup scenario passed on both Windows lanes; #597 therefore does not supply the current correction.

Registry and release inspection confirms neither package has `0.2.1`, `latest` did not move, and no `v0.2.1` tag or GitHub Release exists.

## Goals / Non-Goals

**Goals:**

- Keep README release commands concise without requiring internal lifecycle prose there.
- Retain full target, publication, reopening, recovery, and manual-merge requirements in the operator runbook and command behavior/help.
- Validate relevant README/runbook command contracts on documentation-only pull requests before automatic merge.
- Assert canonical trust-option and persistence identities in native macOS fixtures while preserving lexical prompt-heading expectations.
- Allow only bounded filesystem-level retries when deleting already-disposed test fixture roots on Windows.
- Prove `0.2.1` through a fresh complete stable publication after the correction merges.

**Non-Goals:**

- No detailed release paragraph added back to the root README.
- No weakening or removal of release target parsing, manual reopening, recovery, immutable-version, or stable mutation guards.
- No change to project-trust production canonicalization, decisions, labels, persistence semantics, or fail-closed behavior.
- No test retry, assertion retry, timeout increase, ignored cleanup failure, matrix reduction, or local full/release run.
- No merge, rewrite, or silent closure of PR #597.

## Decisions

### 1. Separate user README checks from operator runbook checks

Refactor the release-documentation contract so the root README must retain accurate `patch`, `minor`, `major`, and exact-version commands, while detailed target-required, publication-before-reopening, next-development, manual-merge, and recovery statements remain mandatory in `docs/ci-release-runbook.md` and applicable command help. Remove the test's requirement that both documents contain identical operational prose.

Adding prose the maintainer does not want is rejected. Removing operator safeguards from all documentation is also rejected because release recovery depends on distinguishing unpublished, published, and reopening states.

### 2. Run a lightweight semantic checker on relevant documentation changes

Extract the dependency-free release-documentation assertions into a small reusable checker. The changed-documentation path shall invoke it when root `README.md` or `docs/ci-release-runbook.md` changes, while unrelated documentation retains the current checks only. Focused tests shall prove concise README commands pass, malformed command examples fail, and missing runbook safety gates fail.

Leaving the assertion only in the complete Vitest suite is rejected: #607/#608 passed documentation auto-merge and deferred discovery until stable publication. Running broad product tests for documentation-only changes is also rejected; this is a bounded semantic governance check.

### 3. Canonicalize only expected trust identities in tests

Resolve the fixture project directory after creation and derive expected trust project/parent identities from that canonical path. Continue expecting the preflight request's `cwd` heading to use the lexical session path, matching production and the canonical specification. Verify trust-store entries through the canonical identity and retain all five choice/action assertions.

Changing production back to lexical paths is rejected because it would violate pinned-Pi parity and allow aliases to represent one directory as different trust identities. A platform-specific `/private` string replacement is rejected in favor of `realpath`.

### 4. Retry only disposable fixture removal after disposal

Keep runtime and adapter disposal awaited exactly as today. Change the shared `afterEach` removal of runtime-integration temporary roots to use Node's bounded recursive-removal retry controls for transient `EBUSY`/`EPERM`/`ENOTEMPTY` release races. Exhausting the bound remains a failed test and preserves the offending path. Test bodies, assertions, application timeouts, and process lifecycle are not retried.

Ignoring cleanup errors or globally extending test timeouts is rejected. Folding this work into #597 is rejected because its recorded failing scenario now passes and its generated provenance names a different source/run.

### 5. Repeat the stable attempt only after merge

The failed run remains immutable evidence. Because no package or stable record was published, the maintainer may rerun `npm run release -- patch` after this corrective PR merges and current `develop` is clean. The new run must validate the exact `0.2.1` bytes on Windows Node 22/24, Linux Node 24, and macOS Node 24; OIDC-publish both packages; verify the registry; pass every native published-pair lane; create release records; move `latest`; and complete the manually merged reopening PR before reporting full success.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Release documentation | Concise README examples resolve correctly; runbook retains target, ordering, reopening, manual merge, and recovery gates |
| Documentation-only path | Relevant README/runbook changes execute the lightweight semantic checker before auto-merge eligibility can succeed |
| macOS trust fixture | Prompt heading remains lexical while option labels and persisted entries use `realpath` identities |
| Windows runtime fixture | Semantic test completes and bounded post-disposal removal handles a transient lock; exhausted cleanup still fails |
| Focused local | Targeted governance, trust-preflight, and runtime-integration tests plus typecheck/documentation/OpenSpec/diff checks pass |
| PR | Finalized exact-head ordinary validation passes without weakening selected scope |
| Post-merge release | Fresh `0.2.1` stable run passes every validation, publication, native smoke, record, aggregate, and reopening gate |

## Risks / Trade-offs

- **README no longer duplicates operator lifecycle details.** The runbook remains authoritative and is still linked from repository documentation; concise command examples stay checked.
- **A bounded delete retry can hide a momentary OS release delay.** It cannot hide a persistent leaked handle because exhaustion remains failure, and no semantic assertion or application operation is retried.
- **Canonical test paths differ by host.** Deriving expectations from `realpath` is the behavior under test and avoids hard-coded macOS aliases.
- **Stable validation is expensive.** A complete rerun is mandatory because focused and PR evidence cannot substitute for native release lanes or OIDC publication.

## Migration Plan

1. After explicit approval and implementation request, continue in this worktree, branch, and draft PR.
2. Implement the semantic documentation split/checker, canonical trust expectations, and bounded fixture cleanup with focused regressions.
3. Complete evidence, gap disposition, finalization, and exact-head PR validation before authorized manual merge.
4. After merge, rerun `npm run release -- patch` from clean current `develop` and require all stable gates plus manual reopening completion.

Rollback uses a later corrective PR. It must not restore lexical trust identity, bypass cleanup failure, republish immutable bytes, or move a stable tag.
