## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- **Not introduced by a suspect commit.** Full regression [#—](https://github.com/timurproko/a1/actions/runs/35576685488) passed the same sweep on the same head `95216f1` at 2026-09-21T08:12Z, 51 minutes before the Release run failed on it. None of the three commits since `7d26554` touch predecessor validation. The failure is paced by the runner, not by the source.
- **What actually failed.** The only failing test file was `test/foundation/release/update-predecessor.integration.test.ts`, and its test passed: `✓ materializes and warms the candidate with each predecessor's own release code (858560ms)`. The failure is `Error: Hook timed out in 120000ms` at line 26, the `afterAll` that calls `fixture.close()`. Every command had already reported `exitCode: 0`, so nothing was hung; `close()` spent the budget removing fixture roots.
- **Why the budget could not hold.** A run retains seven roots: four npm global installations (candidate plus three predecessors) and three sandboxes, each holding a materialized release store that is a full copy of the candidate payload. On the passing lane, removal of all seven took ~73 s (last `warm` report 08:31:00.0, test file complete 08:32:13.5). The failing lane was ~2.4× slower on every npm phase (`install-predecessor` 105 s → 245–282 s, `materialize` 12 s → 19–22 s), which puts the same removal at ~120–180 s, straddling the hook's 120 s limit. The two numbers were also the same number in two places: `close()`'s own default wait budget is 120 s, so the fixture's `roots retained` diagnostic could never win the race against the hook and the failure always read as an opaque timeout.
- **Why the limit was not raised.** `openspec/specs/isolated-regression-testing/spec.md` requires that the real multi-release scenario "SHALL retain existing test, hook, warmup, runner, and workflow time limits". The repair therefore removes the work from the hook rather than widening the hook: every time limit in the file and the fixture is unchanged.
- **The fix.** `PredecessorFixture.discard(path)` releases one fixture-owned root inside the active phase, under that phase's existing 1,800,000 ms budget. The integration test discards each predecessor's installation root and sandbox as soon as its `warm` step has closed, and the candidate root once the loop is done, so teardown has nothing left to remove on the success path. Removal stays inside fixture-owned state: `discard` resolves a path to the recorded root that owns it and fails closed otherwise, and it refuses to run while an owned command is active, which is the existing requirement that cleanup "SHALL not remove a temporary installation while its owned subprocess is active" enforced as a precondition instead of a convention. Phase headroom is sufficient: the test used 858 s of 1,800 s, and the work moved in is the ~120–180 s that teardown was already attempting.
- **Diagnosability gap.** Teardown reported nothing, so a cleanup that outgrew its budget was indistinguishable from a hung child. `discard` and `close()` now report `discard` and `cleanup` evidence with elapsed time and the number of roots the step had to remove, and focused PR-cadence contracts in `predecessor-fixture.test.ts` cover the release path, the ownership refusal, the active-command refusal, and the retained-root failure.
- **Coverage is unchanged.** Predecessor selection, count, ordering, supported-entry checks, exact candidate bytes, assertions, and fail-closed semantics are untouched; no removal is retried and no assertion is relaxed.

## Fix evidence

- Full regression [35651563189](https://github.com/timurproko/a1/actions/runs/35651563189) (workflow_dispatch) on fix head `4f6023a7` at 2026-09-21T20:31:06Z: **success** on all four lanes, including the failed lane windows-2025 node 22 (20:31:38 → 20:58:59, 27.4 min of its 40-minute limit, against 32.6 min for the last passing run of the failed head).
- The teardown hook that failed now has nothing to remove. `windows-2025, node 22` reported seven in-phase releases and an empty cleanup:

  ```text
  discard  1228ms roots=1     (0.1.8-dev.528 sandbox)
  discard  7285ms roots=1     (0.1.8-dev.528 installation)
  discard  4563ms roots=1     (0.1.8-dev.521 sandbox)
  discard  7553ms roots=1     (0.1.8-dev.521 installation)
  discard  1242ms roots=1     (0.1.8-dev.518 sandbox)
  discard  5237ms roots=1     (0.1.8-dev.518 installation)
  discard  5863ms roots=1     (candidate installation)
  cleanup     0ms roots=0
  ```

- Removal cost ~33 s in total, all of it inside the test's own 1,800,000 ms phase budget, and `afterAll` closed with `roots=0`. Predecessor selection, count, ordering, and every time limit are unchanged; the three predecessors exercised were `0.1.8-dev.528`, `0.1.8-dev.521`, and `0.1.8-dev.518`.

## Evidence

- Run [Release #144](https://github.com/timurproko/a1/actions/runs/35581107041) (attempt 1, schedule) on `95216f1` at 2026-09-21T09:03:00Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on win32-node22 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1115^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2706^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 519^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 7680x4320 PNG byte-for-byte without decoding it ^[[33m 1123^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mprefers lossless PNG and preserves visible EXIF orientation during conversion ^[[33m 302^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m release-gating N-1 update transitions^[[2m > ^[[22mhandles idle, busy, stale, failed, rollback, and blocker-exit transitions without duplicate ownership ^[[33m 2238^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/foundation/supervision/foreground-terminal-lease.test.ts ^[[2m(^[[22m^[[2m6 tests^[[22m^[[2m)^[[22m^[[33m 7348^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m plural launch-instance supervision^[[2m > ^[[22mtracks several authenticated owners and completes them independently ^[[33m 1387^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m plural launch-instance supervision^[[2m > ^[[22mreconciles only instances owned by a disconnected socket ^[[33m 1112^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m plural launch-instance supervision^[[2m > ^[[22mreconciles each disconnected instance single-flight without globally serializing siblings ^[[33m 1601^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m launch selection across update completion^[[2m > ^[[22mdoes not promote installed candidate bytes after an update is failed ^[[33m 546^[[2mms^[[22m^[[39m
      ... 25 more lines in the run log
      ```

  - Lane Publication result failed in job `Publication result` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]Process completed with exit code 1.
      ```

  - Last successful Release run: [#143](https://github.com/timurproko/a1/actions/runs/35500168747) on `7d26554`; 3 `develop` commits since:
    - `95216f1` feat(development): report missing build prerequisites by name (#524)
    - `f603b30` Remove pull request integration section from README (#525)
    - `49293b9` Update README.md (#523)
