# Implementation observations

## Written and published checkpoints

- R20 reconciliation was recorded against `b2e47d1cba0129b2cb6ae5b832d8cd96f060994d` before implementation. That checkpoint contained planning only; no implementation or prior completed tasks were discarded.
- `6119461e`: exact R17 installation and checkout-independent planning publication.
- `9f0835a0`: existing task-branch continuation and fresh publication-aware handoff.
- `05eac02a`: distinct published local removal, retained-ref bookkeeping, bounded preservation/recovery and the exact runtime adapter.
- `dbf0a60d`: written preservation repairs for merged-completion preflight, adapter binding, KEEP/claim gates and forbidden process stopping.
- `e214a019`: written exact-candidate integration, authenticated native-arm evidence, live documentation activation checks, scope guards and the executable common-case verifier. The overall fifth PR outcome remains incomplete.
- Publication is verified separately at handoff. Task/PR progress is not a CI or acceptance verdict.

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

The executable fixed-dispatch verifier subsequently passed all 50 unchanged cases, asserting every expected field, with all 11 C37 preservation hazards and no skipped cases. Its private invocation receipts reject expected-result-returning adapters without actual implementation calls. The local command was `node --import tsx --test test/repository-governance/portable-delivery-cases.node.mjs`; it reported 51 passing tests including the final completeness assertion. Twenty-seven additional integration/provenance tests and ten scope/scratch tests passed, including a hold appearing on the final pre-merge read. Initial failures in test transport instrumentation/fixtures were repaired without changing the frozen expectations; a real one-shot diagnostic defect was fixed so changed raw body/head/base snapshots require a fresh decision even when the new body is invalid. These results do not complete outcome 5: the later release-reopening conflict is explicitly recorded in `contract-reconciliation.md`, and focused preservation/guidance checks remain independently reported.

## Subsequent focused repairs and observations

- The full existing isolated cleanup suite passed all 102 tests. Its first concurrent run exposed `unsupported-origin` in the existing empty-common-directory case; an isolated rerun passed. Raw origin reads now use the same bounded empty-output recovery while preserving whitespace rejection, with explicit regression coverage. No timeout, assertion or ownership check was relaxed.
- The runtime completion, documentation controller, guidance and integration wrappers passed together (141 tests). The controller's 118 cases retain protected expected-head behavior and now test exact native receipts, authority-path exclusions and complete textual evidence.
- Trusted finalization, branch refresh and version-3 GitHub reader tests passed with the new final snapshot guard. Declarative workflow inventory initially detected the new read-only proof job's permission; its reviewed configuration was corrected, and all seven governance tests passed without any live apply.
- The validation-suite ownership assertion was expanded by exactly the new portable-case file, preserving every existing owner. All three policy tests passed; the common-case test runs serially in the resource-sensitive partition rather than joining competing Git-heavy workers.
- Typecheck, architecture, full code-documentation governance, strict OpenSpec validation, complete-diff scope inspection, immutable planning/deployed hashes and `git diff --check` passed. Comment-role diagnostics were corrected without changing the documentation checker.
- The all-case runner was rerun successfully after preservation repairs: 50 unchanged cases, 11 hazards, zero skipped, and its final completeness assertion passed. CI, acceptance, live activation and installed runtime availability remain unclaimed. Required finalized-head CI, authorized human acceptance and optional interactive/device observation are separate and are not claimed here. No implementation PR was marked ready by the agent, and no merge was requested or attempted.

The reviewed configuration declares delivery labels, but the read-only live label inspection found `delivery-hold` and `no-auto-merge` absent. This implementation does not create them, change protection/settings or enable workflows. Compatible A1 runtime support must be released before downstream adapter adoption; source and isolated fixtures do not prove an installed release or live activation.

OpenSpec skills, generated commands, dependency pins and framework assets remain outside the implementation. `openspec/config.yaml` changes only repository-owned project context routing; the schema and operation definitions remain unchanged.
