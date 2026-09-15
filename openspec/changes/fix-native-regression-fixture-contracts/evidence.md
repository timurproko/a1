# Implementation evidence

## Authorization

The maintainer approved PR #405's plan and explicitly requested implementation: “approved implement”. Resumed the same clean detached worktree at `35d387f6574e592d553b7cffec161ffbf16f5721`, verified ancestry of merged #402 (`d5d7c1b100158e9d0efdb44f0490ced2ee4ea266`), the draft PR and disabled auto-merge. Planning-policy check passed; skipped draft validation is not implementation evidence. Dependencies installed with `npm ci --ignore-scripts`, without accepting audit suggestions or changing the lockfile.

## Original run and scope boundaries

The complete failed run/source/job ledger is retained in design.md. All four lanes of Full regression `34880029189` failed. macOS's path-spelling assertion and Linux's incomplete acquisition fixture are confirmed by logs/source. Linux's seven-versus-eight admission remains a cleanup hypothesis pending controlled reproduction. Windows Node 24 shell image/fallback assertions and Windows Node 22 release-command timeout remain separate diagnostic-only owners; no corrective changes to them or production code are authorized by this implementation approval.

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

## Read-only Windows-owner diagnosis and remaining approval

The two historical Windows Node 24 shell cases pass when selected alone in this worktree (1067 ms and 714 ms; `.artifacts/windows-shell-diagnostic.log`). Their source uses generic `vi.waitFor` assertions around real asynchronous paste work and calls shell disposal only at the successful end; current evidence does not distinguish cold/helper latency from other runtime or fixture causes. No shell test or production shell code was edited.

The historical Windows Node 22 development patch/manual-gates case passes when selected alone (5235 ms; `.artifacts/windows-release-diagnostic.log`), whereas its native Full regression execution took 21744 ms and exceeded the unchanged 20000 ms test limit. The fixture performs synchronous real Git subprocess operations; existing evidence lacks operation-level timing needed to attribute the excess. No release test, fixture, or production release script was edited.

Those selective invocations are diagnostic runs, not retries of the complete failing gate and not successful recovery evidence. Filtered tests were not removed or reclassified. Before adding diagnostics/corrections to either Windows owner, seek the explicitly required scope refinement. Native fixture verification and all-lane Full regression remain pending; keep this unfinished PR draft rather than launching a knowingly incomplete validation campaign or implying merge readiness.
