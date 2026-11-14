# Contract reconciliation

## Independent review rework at c2249c67

Fetched the current PR branch and fast-forwarded the clean task from `473c9844` to reviewed head `c2249c673da57714eea680677599ca6260f8875a`. No newer remote work was present. Preserved both trusted re-finalizations, the develop merge and clipboard fix #926. Work remains in this existing archive; no active OpenSpec artifacts are manually recreated.

The maintainer explicitly requests repair/publication of the independently reproduced P1 ownership race, P1 replacement/HEAD approval drift and P2 planning-payload admission. These violate R03/R14/R15/R19 despite the previously passing fixed cases (notably C03, C13, C37 and C40). Reopen only 1.2, 3.1–3.4 and 5.4, and their grouped PR outcomes; unrelated completion remains checked. Existing case results do not prove the missing race windows. Add real competing-process suspension/death coverage, exact pre-detach physical/HEAD binding for both operations and an explicit planning-artifact allowlist. Expose the minimal shared attachment/cleanup execution interface and document safe rollout; do not change frozen contract bytes, OpenSpec assets, release policy or activation. Integration remains unauthorized.

Current R11 resolution (verified): the maintainer explicitly approved the paired scope clarification recorded in `r11-clarification.md`. R11 governs ordinary documentation auto-merge; existing release-specific automation remains unchanged under its existing eligibility and authorization rules. Both repositories' planning/deployed rulebooks and verification hashes are updated together. The historical R11 blocker below no longer requires approval; verify the clarified snapshot before recording completion. All other scope, validation and integration gates remain in force.

## Inspected checkpoint

- Repository: `timurproko/a1`; PR: `923`; branch: `chore/simplify-change-delivery`.
- Fetched and inspected planning head: `b2e47d1cba0129b2cb6ae5b832d8cd96f060994d`.
- Base: `41ab0cfa23a7793ed80bec89aff54c804d8973ec` (`origin/develop`).
- Evidence: `git status --short --branch`, `git log origin/develop..HEAD`, and `git diff --name-status origin/develop...HEAD`.
- The checkout is clean. All three topic commits contain planning artifacts only, confined to `openspec/changes/simplify-change-delivery/`. No implementation or modified live guidance exists. No prior completed tasks exist to reopen or erase. Existing history and all planning files are preserved.
- Authority: the maintainer explicitly approved implementing the frozen contract, scoped commits and pushes, starting with this reconciliation. Merge, hosting changes and unrelated deletion remain unauthorized.

## Rule and case reconciliation

| Rules | Cases | Current behavior and required correction |
| --- | --- | --- |
| R01, R17-R20 | C01-C02, C44-C50 | The four frozen planning inputs exist; deployment and behavioral bindings do not. Install exact approved bytes and the routing paragraph, add immutable-snapshot verification and real case bindings. Preserve OpenSpec assets and reject indirect overrides. No earlier implementation is grandfathered. |
| R02-R03, R16 | C03-C08, C42-C43 | Current entry guidance requires a checkout/sweep for planning. Add explicit-identity, checkout-independent publication with expected-head protection and bounded retry discovery; preserve edit-only authority and isolated implementation scratch. |
| R04, R12 | C09-C13, C32-C33 | Existing runtime entry created a base checkout rather than adopting the remote proposal; this session fetched and fast-forwarded it without resetting history. Implement safe remote/local continuation, preserve owned dirty edits, and distinguish publication from attachment/cleanup ownership. |
| R05-R07 | C14-C20 | Deployed guidance requires per-outcome pushes and task grouping; body checks impose lexical/count restrictions. Replace duplicated guidance with the exact contract route and retain structural/completion/acceptance gates. Repair any observed targeted-check failure before publication. |
| R07-R08 | C21-C22 | Trusted finalization exists but the shared hold contract is not implemented across all controllers. Add fresh hold/snapshot checks and archive-based resume without manufacturing acceptance. |
| R09-R11 | C23-C31 | Protected human integration and documentation automation already exist. Preserve deployed integration protection; implement explicit candidate/hold binding and complete-diff authority-path exclusion without changing hosting activation. |
| R12-R15 | C34-C41 | Merged completion/discard exist; published local-only removal and its exact runtime adapter do not. Add a distinct operation retaining refs/remote resources, reusing preservation, ownership and partial-recovery safeguards. Never substitute sweep/complete/discard. |
| R19 | C01-C50 | No shared-case behavioral suite exists. Bind every unchanged case to actual boundaries/effects in isolated fixtures; unsupported behavior remains incomplete, not a passing stub. |

## Planning consistency and blockers

The frozen rulebook, adapter table, cases and digest manifest are the implementation inputs. The design already narrows guidance changes to repository-owned entry points and preserves the OpenSpec boundary. Existing task groups remain in order; all substantive implementation tasks remain unchecked. This reconciliation completes task 1.4 only and does not assert implementation completion, CI success or acceptance.

No conflicting pre-existing implementation was found. No concrete policy conflict had been identified at this initial checkpoint. Any later contradiction, missing adapter authority or framework-dependent outcome will be recorded and reported before the affected action; it will not be resolved by changing frozen policy or expected cases.

## Later conflict: native-arm acceptance wording

Inspected implementation checkpoint: `11342d5811693b02e43036d1b9b72301cecb786c`. Outcomes 1-4 are published and checked. No integration/provenance implementation for outcome 5 has started; all group-5 tasks remain unchecked.

Affected rules/case: R10, R18, C50. The unchanged project-specific `specs/change-delivery-workflow/spec.md` contains conflicting acceptance requirements:

- Line 551: “the arm SHALL constitute acceptance of the listed scenarios for that exact candidate”.
- Line 577: “Only an authorized human's non-automatic merge of that exact head SHALL activate the conditional manifest as acceptance.”
- Frozen R10 permits recognition of a maintainer-owned native arm only with verified authorized ownership and evidence binding it to the exact finalized candidate and acceptance list; it explicitly says the native toggle alone is not acceptance evidence.

These statements do not supply one unambiguous acceptance/provenance contract for the final outcome. In particular, the non-automatic-only clause excludes the native route addressed by R10, while the arm-only scenario omits R10's required binding evidence. R18 and C50 require clarification rather than independently choosing an interpretation.

Disposition: stop affected outcome-5 integration/provenance work and request approval to replace the conflicting project-specific wording with a direct normative reference to R09-R10 and the a1 adapter's acceptance binding. The proposed correction changes no frozen rule, adapter value, expected case, OpenSpec skill or framework asset. No correction was made before that decision. Preserve all implementation, planning history and completed task ticks; do not infer merge, hosting or deletion authority.

### Authorized resolution

At checkpoint `08cc1a7aaf43adb1494994366ef00fc67d082a89`, the maintainer explicitly authorized aligning only this project-specific delta with R09-R10 and the a1 adapter, preserving verified maintainer-owned native auto-merge versus forbidden agent/bot arming. The two conflicting statements now reference those normative owners. All four frozen files, expected cases, OpenSpec skills/framework and prior completed work remain unchanged. Outcome 5 resumes under the existing implementation/publication approval; merge and hosting changes remain unauthorized.

## Later conflict: release-reopening integration

Inspected published checkpoint: `08cc1a7aaf43adb1494994366ef00fc67d082a89`, plus the retained outcome-5 workspace. At that checkpoint `origin/develop` was fetched at `c362c4e8` and had not yet been reconciled into this topic. No history, unrelated completion or existing implementation was discarded.

Affected rules/case: R11, R18, R20, C50. Frozen R11 permits automation-owned integration only for independently eligible routine documentation. The existing `manage-documentation-auto-merge.mjs` fallback accepts `classifyReleaseReopening()` even after ordinary documentation classification rejects the diff. That route explicitly modifies `package.json`, `package-lock.json` and `packages/a1-install/package.json`, plus the release note. Its reviewed release runbook and `scripts/release/check-release-documentation.mjs` require automatic integration after CI. It is not a routine documentation-only diff.

No exception for release-reopening integration is present in the frozen adapter. Preserving this route as compliant would grandfather a conflicting interpretation; changing it to manual integration affects existing release behavior, guidance and assertions beyond the specifically authorized native-arm wording reconciliation. The affected route remains an explicit incomplete outcome, not a passing contract exception.

Disposition at that checkpoint: retain existing release code and history; leave outcome 5 unchecked. Request the maintainer's decision on making reopening PRs manual-integration-only and reconciling that project-specific release guidance/tests, without modifying frozen files or OpenSpec framework assets. No merge, workflow activation or hosting change is authorized. The 50-case local result is reported separately and does not establish whole-policy conformance for this uncovered conflict.

### Maintainer scope decision and independent continuation

The maintainer explicitly rejected release-policy changes and manual-only reopening PRs: release automation is outside this PR's scope and its existing behavior must be preserved. This is not approval to refine the frozen contract or invent an R11 exception. Coordinated R11 clarification must preserve the existing release-specific automation while restricting ordinary documentation auto-merge. No further release-policy decision is requested in this PR.

Only that conflict remains blocked (the coordinated-clarification portion of task 5.2 and the overall fifth Implementation outcome). The independent ordinary-docs code/tests are written, and compatibility work continues without altering release automation, its checker or its established regression expectations. No frozen input is edited, and passing local cases do not resolve the shared-policy conflict.

Preserved-work reconciliation: `e6e52727e4e9a00be3c6ab715d3a9e6d42925ef8` was clean and published before continuation. A normal topic merge of fetched `origin/develop` (`c362c4e8`) produced `e767634e772914f918f5a8840e7da18c3a05ab07`, retaining both histories, upstream identity/detach fixes and completed work. This was topic/base synchronization, not integration of PR #923; primary and remote protected integration were untouched. The task remains attached and no cleanup, release publication, hosting apply or PR merge is authorized.

During checks, the observed base advanced to `82d030bf` (#925). After committing the independent work as `4d2cfdb5`, a second clean topic sync produced `c6d2bbf824d2b82460e59eb120d4c970cf27420d`; no observed base commits remained missing. Both topic merges preserve histories and are not integration of PR #923.

Independent compatibility checks cover immutable version-1/2 receipts, legacy version-3 readers, existing CLI aliases, historical cleanup journals and standalone removal without runtime identity/credential storage. Paired rollout is documented in `docs/features/worktrees.md`; an installed compatible release, downstream adoption, live CI and human/device acceptance are not inferred from source tests.

### Verified published paired clarification and final continuation

Fetched PR #923's maintainer-published `147ea76f976f65dd3fb29cb9142a268f2f4f3901` and fast-forwarded the clean existing task from `f45c10971975a6908237974dcbd0729433964cd0`, preserving all implementation and completed work. The maintainer's PR notice and the current instruction explicitly resolve R11; no further R11 approval is required or requested.

Verified all eight planning/deployed contract paths against `timurproko/xrbuild` PR #19's immutable published head `90336d61028c850b85da08a0f8aec931de7af839` using read-only GitHub contents requests, without a checkout, installation or migration of that repository. Both copies match the approved rulebook hash `f2518a1e49317eef3c64c79733162b80613afee0cbdaf6e6945117e1a6be9876` and manifest hash `940f241fbdb925c79b2c9717ead2b41e64f05e93b5ff4d9edd96fb3b11f1faa1`. Cases and adapter hashes remain unchanged, and a byte comparison outside R11 confirms all other rule sections are unchanged. Release controller/reopening/checker/workflow code is unchanged by this continuation and the clarification.

Ordinary-docs operational wording now follows the approved scope. The current common-case run, ordinary-docs/release regressions and read-only finalization inspection passed; all source tasks are checked. Publish this evidence and the final PR outcome tick with plain Acceptance scenarios, keeping publication separate from local completion. Trusted automation retains readiness/finalization ownership. Downstream runtime-release availability remains a deployment prerequisite, not a claim of an installed release. No merge, release publication, hosting apply, label creation, private export or user-worktree cleanup is authorized.
