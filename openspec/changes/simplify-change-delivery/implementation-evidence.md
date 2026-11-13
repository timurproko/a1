# Implementation observations

## Written and published checkpoints

- R20 reconciliation was recorded against `b2e47d1cba0129b2cb6ae5b832d8cd96f060994d` before implementation. That checkpoint contained planning only; no implementation or prior completed tasks were discarded.
- `6119461e`: exact R17 installation and checkout-independent planning publication.
- `9f0835a0`: existing task-branch continuation and fresh publication-aware handoff.
- `05eac02a`: distinct published local removal, retained-ref bookkeeping, bounded preservation/recovery and the exact runtime adapter.
- Later progress remains in `tasks.md` and the published PR checkboxes; neither is a CI or acceptance verdict.

## Focused local checks actually observed

- Strict OpenSpec validation of `simplify-change-delivery` passed.
- Typecheck passed after the required core build produced the bin typecheck inputs. The initial missing-dist failure was not hidden or treated as success.
- Architecture checks passed after splitting the expanded worktree-entry function; no size threshold was relaxed.
- The planning, guidance and worktree-guidance tests passed, including immutable-byte/digest drift and expected-head publication cases.
- Existing worktree-entry tests plus remote-proposal, unoccupied local branch and divergent-history fixtures passed. Fixture line endings were made deterministic with local Git configuration. A concurrent run reached existing five-second limits; the isolated rerun passed without changing assertions or timeouts.
- Runtime completion/local-removal and CLI dispatch tests passed, including missing-adapter preservation, preflight-before-detach, post-detach ownership and changed adapter identity.
- All 18 isolated local-removal fixtures passed, including independent dirty/untracked/unknown-ignored/private/KEEP/nested/gitlink/link/owner/current-directory hazards, remote evidence failure, retained refs, CLI execution and interrupted/recreated checkout recovery.
- Six focused existing cleanup tests passed for state schema, ownership, merged completion, terminal journal reuse and regular gitmodules compatibility.
- Body/checklist/archive-policy, scoped-authority/progress, refresh and documentation-controller focused tests passed against R05-R08. The trusted finalization fixtures passed, including focused head-race and held archived-draft resume cases. Required structural, machine-linkage, task-completion and acceptance-binding assertions remain; count/style/vocabulary-only rejections are replaced by positive conformance cases.

## Audited suite-loader observation

The audit's delivery-body suite-loader failure is not reproducible with the pinned lockfile installed in this owned checkout. Vitest 3.2.7 collects and executes `check-delivery-body.test.ts` normally, and its eight tests pass. The audit provided no loader stack identifying an independent cause; standalone syntax success alone was not substituted for a test run. No speculative runtime change, timeout increase or suppressed assertion was used to make the suite load.

## Evidence still separate

The complete shared-case binding outcome is unfinished until task 5.3 is complete; the observations above do not claim all 50 cases pass. Required finalized-head CI, authorized human acceptance and optional interactive/device observation are separate and are not claimed here. No implementation PR was marked ready by the agent, and no merge was requested or attempted.

The reviewed configuration declares delivery labels, but the read-only live label inspection found `delivery-hold` and `no-auto-merge` absent. This implementation does not create them, change protection/settings or enable workflows. Compatible A1 runtime support must be released before downstream adapter adoption; source and isolated fixtures do not prove an installed release or live activation.

OpenSpec skills, generated commands, dependency pins and framework assets remain outside the implementation. `openspec/config.yaml` changes only repository-owned project context routing; the schema and operation definitions remain unchanged.
