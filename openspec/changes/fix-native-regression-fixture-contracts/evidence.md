# Implementation evidence

## Authorization

The maintainer approved PR #405's plan and explicitly requested implementation: “approved implement”. Resumed the same clean detached worktree at `35d387f6574e592d553b7cffec161ffbf16f5721`, verified ancestry of merged #402 (`d5d7c1b100158e9d0efdb44f0490ced2ee4ea266`), the draft PR and disabled auto-merge. Planning-policy check passed; skipped draft validation is not implementation evidence. Dependencies installed with `npm ci --ignore-scripts`, without accepting audit suggestions or changing the lockfile.

## Original run and scope boundaries

The complete failed run/source/job ledger is retained in design.md. All four lanes of Full regression `34880029189` failed. macOS's path-spelling assertion and Linux's incomplete acquisition fixture are confirmed by logs/source. Linux's seven-versus-eight admission remains a cleanup hypothesis pending controlled reproduction. At the initial implementation checkpoint, Windows Node 24 shell image/fallback assertions and the Windows Node 22 release-command timeout remained diagnostic-only owners. The subsequently approved extension below authorizes their test/fixture corrections; production changes remain outside authorization.

Normal #402 CI success and its merge do not constitute successful nightly recovery. Exact-current-head CI, maintainer acceptance/merge authorization, newer numbered-package scheduled nightly, spec synchronization and archival remain pending.

## Controlled regressions and corrections

### Directory identity

The new real-process fixture exercises ordinary paths, a directory alias/junction, a child changing to that same directory's canonical spelling, and a wrong-directory control. With the previous lexical oracle it failed the canonical-reporting case (1 failed, 11 passed; `.artifacts/cwd-before.log`). Comparing independently resolved requested and observed filesystem identities made all 12 cases pass (`.artifacts/cwd-after.log`). Exact argv, metacharacters/spaces, and npm sanitation assertions remain unchanged in strength. No runtime path or command-runner code was modified. The historical native macOS failure remains in design.md; native corrected macOS evidence is still pending.

### Clipboard boundary

Source and emitted fixtures now share a narrowly scoped import hook for the actual system-clipboard reader and response-copy helper entries. Controlled text/empty/denied/fallback modes intercept Linux commands and Windows/macOS native/command paths, with exact command arguments, bounded operation-only traces, a permanently failed state after an unexpected operation, and no real clipboard command forwarding. The real source/emitted paste helper and classification worker still run. The original deliberately real blocked-command descendant fixture remains intact.

New source/emitted matrix tests verify exact original text, empty null, denied error, and fallback results plus actual acquisition-operation traces. Separate unexpected-command/argument controls prove fail-closed behavior and run an unrelated real Node child through an unmodified child-process import. These checks passed locally on Windows; native Linux fallback coverage still needs CI, and is not claimed from Windows execution.

### Failed assertion and admission capacity

A controlled helper reports acquisition failure while retaining its IPC lifetime. The old cancel-without-await cleanup admitted only seven new jobs: 8 total forks including the failed helper, against the expected 9. The regression failed exactly that assertion (`.artifacts/cleanup-before.log`), then passed after awaiting the failed helper's existing `stopped` boundary. No sleep or raised stop deadline was used. The intentionally rejected assertion remains observable, and all controlled children are stopped even in the red case.

Affected source, emitted, and lifecycle tests now await shutdown in failure-safe cleanup, including unexpectedly admitted overflow controls. Original eight-request admission, ninth rejection, 12 cycles, 16 recovery forks, exact clipboard strings, image assertions, terminal-handle isolation, and conversion serialization are retained. This establishes the contamination mechanism without claiming to identify every historical asynchronous event.

## Local validation

- **57 focused tests passed on each of Windows Node 24.16.0 and Node 22.23.2**, across the predecessor command-error test and four clipboard files. Final logs: `.artifacts/focused-final-node24.log`, `.artifacts/focused-final-node22.log`.
- Build including native guardian, repository typecheck, full tracked-file code-documentation review, architecture/product identity/source-ledger/terminal-host provenance, documentation governance, strict OpenSpec, and whitespace checks passed.
- No production source, dependency/lockfile, workflow, suite classification, retry, existing timeout, baseline, or stable rendering/input budget change was made. No physical desktop or local full-repository test suite was run.

## Initial read-only Windows-owner diagnosis (before extension)

The two historical Windows Node 24 shell cases pass when selected alone in this worktree (1067 ms and 714 ms; `.artifacts/windows-shell-diagnostic.log`). Their source uses generic `vi.waitFor` assertions around real asynchronous paste work and calls shell disposal only at the successful end; current evidence does not distinguish cold/helper latency from other runtime or fixture causes. No shell test or production shell code was edited.

The historical Windows Node 22 development patch/manual-gates case passes when selected alone (5235 ms; `.artifacts/windows-release-diagnostic.log`), whereas its native Full regression execution took 21744 ms and exceeded the unchanged 20000 ms test limit. The fixture performs synchronous real Git subprocess operations; existing evidence lacks operation-level timing needed to attribute the excess. No release test, fixture, or production release script was edited.

Those selective invocations are diagnostic runs, not retries of the complete failing gate and not successful recovery evidence. Filtered tests were not removed or reclassified. This checkpoint required the scope refinement that was subsequently approved below. These diagnostic passes were not used to mark the failing native run green.

## Approved Windows extension and final local implementation

The maintainer approved “extend” in response to extending both plan and implementation, then explicitly requested “implement the whole solution push pr”. Proposal/design/spec/tasks were reconciled and pushed first at `4d59b371e779df516ad6d00c4e9625ff3c243b56`. The added code remains test/fixture-only.

### Bounded first-attempt diagnostics

`NativeRegressionTrace` retains at most 64 recent records, 32 operation categories and 16 active spans, with aggregate counts and explicit dropped-record evidence. It records public labels and numeric timing/lifetime fields only: no arguments, errors, clipboard/image/prompt contents, terminal bytes, or user paths. Synchronous results/errors and the original asynchronous promise are preserved. Six tests cover exact identities, unfinished work, rejected/synchronous failure paths, output bounds/conservation, privacy, defensive snapshots, and observation equivalence. Failure hooks report the original failing attempt; optional local successful reports use `NATIVE_REGRESSION_DIAGNOSTICS=1` and do not alter test deadlines.

### Shell fixture correction

First-attempt phase data exposed test-only source-loader overhead. The image request-to-cleanup path took 558 ms with source-loaded helpers, versus 139 ms with the current build's real cold emitted helper and exact image-worker entry. Only the two affected shell fixtures select emitted entries; no worker is cached, prewarmed, or replaced with a fake result. Unrelated worker entries/options remain untouched, and original source-helper coverage remains in the other fixture tests. The real parent preparation client, child/worker lifetimes, native codec, callbacks, image bytes, text fallback, editor/copy and all submission assertions remain exercised.

A per-test completion hook disposes the owned shell and restores the scoped fixture selection even on failed assertions. A controlled failing-assertion case verifies pending paste cleanup, retained error identity, and one disposal. Four separate cold-worker tests verify exact bootstrap selection, unrelated-worker preservation, and real source/emitted equivalence for valid canonicalization and malformed input. Logs: `.artifacts/windows-shell-phases-before.log`, `.artifacts/windows-shell-phases-emitted.log`. Local timings explain removable fixture cost; they do not establish every historical scheduling event or replace native CI.

### Real Git fixture correction

Bounded timing located most cost in repeated real local transport commands. A controlled Git Trace2 experiment found 18 ancillary automatic-maintenance children. Private per-fixture Git configuration now disables automatic housekeeping (`gc.auto=0`, `maintenance.auto=false`, `receive.autoGC=false`) for its disposable checkout and bare remote only. No user or repository Git configuration is changed.

The before/after control retained all 80 workflow Git calls, identical stable publication/development reopening results, and identical other child categories (32 other, 5 pack-objects, 12 rev-list); maintenance children changed from 18 to zero. The full assertion-bearing local scenario retained all 113 diagnostic operations and decreased from 5674 ms to 4272 ms, including the same 9 workflow fetches and 4 workflow pushes. This removes incidental fixture housekeeping, not a release operation, independent assertion, or measured workload. No mutable fixture sharing, cached Git answers, fake repository model, changed clock, delayed measurement, or larger limit was introduced.

A regression verifies the private settings in both real repositories plus real object consistency. Cleanup is registered immediately after root creation, before setup can fail. All 35 release-command tests retain the real Git/manual-gate workflow, exact manifests/locks, ordering, branch/source and unrelated-state checks. Diagnostic raw Git traces were confined to the local experiment and removed after deriving bounded child-category counts. Logs: `.artifacts/git-children-before.log`, `.artifacts/git-children-private-config.log`, `.artifacts/windows-release-phases-before.log`, `.artifacts/windows-release-phases-after.log`.

### Final local verification and remaining gates

**384 unique focused tests passed on each Windows runtime, Node 24.16.0 and Node 22.23.2**, across nine explicitly selected files: 282 shell, 35 release-command, 6 diagnostics, 4 cold-worker, and the prior 57 native-fixture tests. These are containing-file/focused runs, not a local repository-wide full suite. Logs include `.artifacts/windows-shell-complete.log`, `.artifacts/windows-shell-complete-node22.log`, `.artifacts/fixture-release-complete-node24.log`, `.artifacts/release-final-node24.log`, and `.artifacts/fixture-release-final-node22.log`.

Typecheck, full tracked-file code-documentation, architecture/provenance, documentation governance, strict OpenSpec and whitespace checks passed. Production source, dependencies/lockfile, workflows, suite classification, existing polling/test/hook limits, baselines and rendering/input budgets remain unchanged. Build is retained as the emitted-worker precondition.

The approved implementation is ready for remote validation, not accepted recovery. Mark this same PR ready before ordinary CI, dispatch the separate four-native-lane Full regression, and retain every failure. Corrected native macOS/Linux evidence, final current-head CI, maintainer acceptance/manual merge, newer numbered merged-package scheduled nightly, and archival remain pending. Do not equate local success or readiness with those outcomes.

## Integration and retained exact-head failure

PR #405 source `2d0dd1503edda48f8ad18075256c45b0fb59e177` passed ordinary Development validation [34940561264](https://github.com/timurproko/a1/actions/runs/34940561264). The PR was then manually merged as `2d992336c48790fb2f793883816905c9db2ec5e7` on 2026-09-15. Auto-merge remained disabled, but no exact-head `openspec-acceptance` record or successful all-lane Full regression preceded that merge; do not infer either from integration.

Full regression [34940561468](https://github.com/timurproko/a1/actions/runs/34940561468) retained these final outcomes:

| Lane / job | Outcome |
| --- | --- |
| Full documentation review / `104288063332` | Passed. |
| Linux Node 24 / `104288161266` | Passed: 3296 tests, 9 skipped. The corrected 12 predecessor cwd, 10 source acquisition, 6 emitted clipboard, 24 executor, and 5 lifecycle tests all executed and passed. |
| macOS Node 24 / `104288161283` | Passed: 3296 tests, 9 skipped. The corrected 12-case predecessor cwd file executed and passed. |
| Windows Node 24 / `104288161306` | Passed. |
| Windows Node 22 / `104288161345` | Failed: 4 session-shell tests; 3291 tests passed and 10 skipped. |

The prior Windows release owner passed in this contended lane: the development patch/manual-gates case completed in 6381 ms under its unchanged 20000 ms limit. The two originally named Windows shell owners also passed in 657 ms and 453 ms. The four newly exposed shell failures were:

- large text through right-click retained its generic provisional screenshot marker rather than applying the expected 136-line text chip;
- second-first image ordering retained pending state for the second image;
- restored waiting intent still reported `image-pending` after release;
- real-image rejection/retry retained pending state.

All four occur earlier in `session-shell.test.ts`, outside this change's two-case emitted-entry selection. The screenshot-shaped marker is reserved before acquisition classification and therefore does not prove host-image acquisition or text misclassification. The combined evidence demonstrates that the fixture correction was too narrowly selected: other cases retained test-only TypeScript helper/worker startup under Windows Node 22 contention. It does not establish a production shell defect.

Tasks 2.2, 3.1, 3.2 and 5.2 are complete from the exact native/current-head evidence. Task 5.3 remains failed and incomplete; acceptance, scheduled numbered-package nightly, reconciliation and archive tasks remain blocked. The corrective change `fix-session-shell-native-fixture-isolation` and draft PR #407 track immutable file-wide emitted-entry fixture selection. #405's worktree remains retained, and its premature merge must receive explicit final disposition after combined recovery rather than fabricated pre-merge acceptance.
