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

No conflicting pre-existing implementation was found. No concrete policy conflict has been identified at this checkpoint. Any later contradiction, missing adapter authority or framework-dependent outcome will be recorded and reported before the affected action; it will not be resolved by changing frozen policy or expected cases.
