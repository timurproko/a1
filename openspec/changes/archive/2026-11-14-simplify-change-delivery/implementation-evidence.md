# Implementation observations

Current R11 disposition: the maintainer-approved paired clarification in `r11-clarification.md` resolves the later wording blocker described below. Prior observations remain historical; this clarification changes no release behavior, case expectations or adapter values. Current local verification is recorded below, separately from CI and acceptance.

## Written and published checkpoints

- R20 reconciliation was recorded against `b2e47d1cba0129b2cb6ae5b832d8cd96f060994d` before implementation. That checkpoint contained planning only; no implementation or prior completed tasks were discarded.
- `6119461e`: exact R17 installation and checkout-independent planning publication.
- `9f0835a0`: existing task-branch continuation and fresh publication-aware handoff.
- `05eac02a`: distinct published local removal, retained-ref bookkeeping, bounded preservation/recovery and the exact runtime adapter.
- `dbf0a60d`: written preservation repairs for merged-completion preflight, adapter binding, KEEP/claim gates and forbidden process stopping.
- `e214a019`: written exact-candidate integration, authenticated native-arm evidence, live documentation activation checks, scope guards and the executable common-case verifier. At that checkpoint the overall fifth PR outcome remained incomplete.
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

## Independent completion after the release scope decision

The maintainer directed that release-specific automation remain unchanged and outside this PR. The proposed manual-only conversion was rejected; no local R11 refinement or exception was authorized. Task 5.4 and the independent ordinary-documentation portion of 5.2 are written. At that checkpoint, coordinated R11 clarification kept 5.2 and the fifth PR outcome incomplete; the subsequent approved resolution is recorded in `r11-clarification.md`.

- Reconciled the topic with `origin/develop` through a history-preserving topic merge, retaining upstream identity/detach recovery and completed task work. This was not a PR merge or protected-branch push.
- Added byte-preservation checks for version-1/2 receipt bodies/trees and historical cleanup journals, and explicit current/legacy command dispatch equivalence under both release capabilities.
- The standalone removal CLI passed with A1/PI session identity and GitHub credential environment removed, an isolated empty home, no runtime storage initialized, and local/remote refs retained. No runtime install or hosting migration was performed.
- Compatibility checks exposed a real coupling regression: treating documentation-auto-merge ineligibility as operational implementation could admit planning-only legacy receipts. Separated stable document/operational scope from integration authority; restored the original rejection and added authority-document/rename regression coverage. Current ordinary auto-merge exclusions remain enforced, and release automation/checker files were not modified.
- Ten focused compatibility/controller files passed all 469 tests, including the unchanged release-specific controller regressions and strict historical reader assertions.
- Upstream environment tests exposed a diagnostic-order regression on a dirty checkout without an adapter. Runtime completion now checks actual content before adapter lookup and repeats the check after repository preflight. The existing dirty-override expectation remains unchanged; a new late-content race fixture verifies preservation before detach. The repaired completion file passed all 15 tests; the six explicit-root integration cases, three Git-environment cases, twelve entry cases and eight body-validation cases also passed.
- The full common-case runner passed again after these independent repairs: 50 unchanged cases, all 11 preservation hazards, 51 passing tests including completeness, zero skipped. The canonical-target late-content fixture was corrected without weakening its expected error or data/attachment assertions.
- Core build, typecheck, architecture, code-documentation governance, strict OpenSpec validation, frozen-byte/scope inspection and whitespace checks passed. These are local observations, not installed-runtime, live-CI or human/device acceptance evidence.

## Approved R11 verification and implementation completion

Fetched and preserved the maintainer's `147ea76f976f65dd3fb29cb9142a268f2f4f3901` update. The maintainer's PR notice and `r11-clarification.md` explicitly approve the paired refinement; no further R11 decision is pending. Read-only contents verification confirmed all eight planning/deployed contract paths match across both published PRs at their observed immutable heads. The new rulebook/manifest hashes match the approved anchors; the 50 cases, adapters and all non-R11 rule sections remain byte-identical.

- The current common-case runner passed all 50 unchanged cases and all 11 hazards, plus its final completeness assertion: 51 passed, zero failed/skipped.
- Six focused guidance, planning/contract, ordinary-docs/release controller, integration/provenance, release-documentation and repository-governance files passed all 175 tests. Existing release-specific expectations and release code/workflows are unchanged.
- Updated only ordinary-docs operational wording to route to R11 rather than a blanket docs prefix or blind human-arm cancellation. Added guidance consistency coverage while preserving the existing release-route description and checker.
- Typecheck, architecture, full code-documentation governance, strict OpenSpec validation, contract installation/scope inspection and whitespace checks passed for the clarified snapshot.
- Intended-body validation passed both before and after the previewed final tick. A fresh fetch found no missing `develop` commits; read-only finalization inspection returned `would-finalize` against that current base, validating tasks, Acceptance, archive/delta preparation and the conditional manifest in a temporary sandbox. No archive/spec synchronization was applied to this checkout and the agent did not mark the PR ready.
- All implementation tasks are written and checked. Plain implementation-specific Acceptance scenarios are prepared for the PR; publication and the final PR checkbox are separate from trusted readiness/finalization and required finalized-head CI. Compatible installed A1 support before downstream adoption, live activation and optional human/device observation remain deployment/evidence boundaries, not unperformed source tasks or claimed validation.

## Evidence still separate

The executable fixed-dispatch verifier subsequently passed all 50 unchanged cases, asserting every expected field, with all 11 C37 preservation hazards and no skipped cases. Its private invocation receipts reject expected-result-returning adapters without actual implementation calls. The local command was `node --import tsx --test test/repository-governance/portable-delivery-cases.node.mjs`; it reported 51 passing tests including the final completeness assertion. Twenty-seven additional integration/provenance tests and ten scope/scratch tests passed, including a hold appearing on the final pre-merge read. Initial failures in test transport instrumentation/fixtures were repaired without changing the frozen expectations; a real one-shot diagnostic defect was fixed so changed raw body/head/base snapshots require a fresh decision even when the new body is invalid. Those observations alone did not complete outcome 5 at that checkpoint; the later release-reopening conflict and its subsequent approved resolution are recorded in `contract-reconciliation.md`. Current completion evidence is in the approved R11 verification section above.

## Subsequent focused repairs and observations

- The full existing isolated cleanup suite passed all 102 tests. Its first concurrent run exposed `unsupported-origin` in the existing empty-common-directory case; an isolated rerun passed. Raw origin reads now use the same bounded empty-output recovery while preserving whitespace rejection, with explicit regression coverage. No timeout, assertion or ownership check was relaxed.
- The runtime completion, documentation controller, guidance and integration wrappers passed together (141 tests). The controller's 118 cases retain protected expected-head behavior and now test exact native receipts, authority-path exclusions and complete textual evidence.
- Trusted finalization, branch refresh and version-3 GitHub reader tests passed with the new final snapshot guard. Declarative workflow inventory initially detected the new read-only proof job's permission; its reviewed configuration was corrected, and all seven governance tests passed without any live apply.
- The validation-suite ownership assertion was expanded by exactly the new portable-case file, preserving every existing owner. All three policy tests passed; the common-case test runs serially in the resource-sensitive partition rather than joining competing Git-heavy workers.
- Typecheck, architecture, full code-documentation governance, strict OpenSpec validation, complete-diff scope inspection, immutable planning/deployed hashes and `git diff --check` passed. Comment-role diagnostics were corrected without changing the documentation checker.
- The all-case runner was rerun successfully after preservation repairs: 50 unchanged cases, 11 hazards, zero skipped, and its final completeness assertion passed. CI, acceptance, live activation and installed runtime availability remain unclaimed. Required finalized-head CI, authorized human acceptance and optional interactive/device observation are separate and are not claimed here. No implementation PR was marked ready by the agent, and no merge was requested or attempted.

The reviewed configuration declares delivery labels, but the read-only live label inspection found `delivery-hold` and `no-auto-merge` absent. This implementation does not create them, change protection/settings or enable workflows. Compatible A1 runtime support must be released before downstream adapter adoption; source and isolated fixtures do not prove an installed release or live activation.

OpenSpec skills, generated commands, dependency pins and framework assets remain outside the implementation. `openspec/config.yaml` changes only repository-owned project context routing; the schema and operation definitions remain unchanged.

## Finalized-head CI repair

Fetched and fast-forwarded the clean task to trusted finalization commit `6b2fabb21e042a56ec7c607f17efc4523ae429e3`, retaining its archive, synchronized specs, manifest and completed tasks. PR run `43584066719` then exposed seven missing serialized-name declarations and one stale composition fixture; the required aggregate failed and two other lanes were cancelled. This was not successful finalized-head CI.

- Registered six exact file/member boundaries for the immutable shared adapters' repository key and C13 observation field. These are prescribed external serialized fields, not new branded internal names. The inspector, frozen contract bytes and expected cases are unchanged. Added positive boundary and negative unrelated-file/local-identifier/other-member coverage.
- The composition fixture now declares a compatible preservation-preflight/cleanup pair before attachment, then makes only the primary adapter unavailable after the request. It retains the existing shell-report, primary-cwd, task-content and once-only assertions, and the diagnostic again identifies `.a1/worktree.json`. A new composed case verifies that missing preflight support rejects completion without detaching or redirecting subsequent writes.
- The five focused naming/selection, composition recovery and runtime-completion files passed all 80 tests after repairing a new test fixture's same-line deduplication assumption. Both occurrences now occupy separate lines; the expected counts and negative assertions were retained. All 50 unchanged common cases and 11 hazards passed again (51 tests including completeness, no skips).
- Full naming audit inspected 1,349 tracked inputs with zero violations. Typecheck, architecture, full code-documentation governance, frozen-contract/scope inspection and whitespace checks passed. No timeout, inspector rule, assertion or required CI gate was weakened.

These repairs are a new checkpoint after completed implementation, not a reason to erase task ticks or recreate active artifacts. Trusted automation owns re-finalization and new exact-head CI. Release-specific automation, Acceptance scenarios, hosting and integration authority remain unchanged; no merge is authorized.
