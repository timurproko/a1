# Contract reconciliation

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

Inspected published checkpoint: `08cc1a7aaf43adb1494994366ef00fc67d082a89`, plus the retained outcome-5 workspace. Current `origin/develop` was fetched at `c362c4e8`; it has not yet been reconciled into this topic. No history, unrelated completion or existing implementation was discarded.

Affected rules/case: R11, R18, R20, C50. Frozen R11 permits automation-owned integration only for independently eligible routine documentation. The existing `manage-documentation-auto-merge.mjs` fallback accepts `classifyReleaseReopening()` even after ordinary documentation classification rejects the diff. That route explicitly modifies `package.json`, `package-lock.json` and `packages/a1-install/package.json`, plus the release note. Its reviewed release runbook and `scripts/release/check-release-documentation.mjs` require automatic integration after CI. It is not a routine documentation-only diff.

No exception for release-reopening integration is present in the frozen adapter. Preserving this route as compliant would grandfather a conflicting interpretation; changing it to manual integration affects existing release behavior, guidance and assertions beyond the specifically authorized native-arm wording reconciliation. The affected route remains an explicit incomplete outcome, not a passing contract exception.

Disposition: retain existing release code and history; leave outcome 5 unchecked. Request the maintainer's decision on making reopening PRs manual-integration-only and reconciling that project-specific release guidance/tests, without modifying frozen files or OpenSpec framework assets. No merge, workflow activation or hosting change is authorized. The 50-case local result is reported separately and does not establish whole-policy conformance for this uncovered conflict.
