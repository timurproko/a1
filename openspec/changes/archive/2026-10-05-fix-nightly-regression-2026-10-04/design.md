## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- Treat the failure as runner-contention exposure rather than a product regression or a suspect-range code change. The failing test's bytes have been unchanged since `060d2dd0`, none of the six commits after the last successful Publish run touched it, and the same Windows Node 22 test moved from 1,125 ms in successful Publish run `37112403859` to the exact 15,008 ms timeout in failed run `37193608959`.
- Move `test/features/prompt-history/concurrency.integration.test.ts` into the existing `fast-resource-sensitive` membership. It starts three concurrent `tsx` child processes against shared temporary SQLite storage, matching the canonical resource-sensitive contract, while its sibling `store.test.ts` is already assigned there.
- Keep the test body, 15-second test timeout, three-writer workload, assertions, no-retry behavior, and history-compatibility platform ownership unchanged. The authoritative plan will exclude the file from `vitest-full-without-isolated` and execute it once in the non-file-parallel resource invocation under the existing 30-second partition hang bound.
- Add governance expectations for authoritative membership and full-plan placement. No specification delta is needed because the canonical continuous-integration and isolated-regression-testing requirements already prescribe this classification for subprocess and temporary-storage workloads.

## Evidence

- Failure log inspection identified one assertion owner: `multi-process prompt history > serializes simultaneous first-open, writes and pruning` timed out at 15,008 ms; the other 4,269 tests passed on the failed Windows Node 22 lane. The aggregate `Publication result` failure was downstream orchestration, not a second defect.
- The preceding successful Publish run executed the same test in 1,125 ms on Windows Node 22. The unchanged source blob is `f072e390bf18d18b763ab451558016e711597c3c` both at its last edit and at the failed head.
- Pre-implementation generated-plan inspection showed the failed file absent from `fast-resource-sensitive`, leaving it in the two-worker parallel core invocation while separately serializing `test/features/prompt-history/store.test.ts` and other shared-resource suites.
- Focused implementation evidence: the prompt-history concurrency suite plus validation-suite, resource-partition, and full-regression policy suites passed 33/33 in one non-file-parallel invocation; the previously failing simultaneous first-open/write/prune case completed in 381 ms with its unchanged 15-second timeout.
- Generated full-release plan inspection confirmed the suite is excluded from `vitest-full-without-isolated`, occurs exactly once in the resource-sensitive invocation with file parallelism disabled, and belongs to the resource shard.
- `npm run build --silent && npm run typecheck` passed. A typecheck attempted before the required build failed only because the generated `dist/` declarations were absent; building restored the declared prerequisite and the unchanged typecheck passed.
- Pre-finalization observation: the approved implementation was completed while the PR remained draft, so Development validation and selected PR Full regression correctly remained deferred. Their finalized exact-head results belong in Actions and the handoff rather than another evidence commit.
- Known gaps: none.

- Run [Publish #6](https://github.com/timurproko/a1/actions/runs/37193608959) (attempt 1, schedule) on `7dafde8` at 2026-10-04T09:53:46Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on win32-node22 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
         ^[[33m^[[2m✓^[[22m^[[39m ready pull-request refresh command^[[2m > ^[[22mreports each candidate and fails when a candidate failed ^[[33m 311^[[2mms^[[22m^[[39m
      [validation-phase] {"schema":"a1-validation-phase-v1","fixture":"release-command-fixture","invocation":"c2378a86-15aa-49e9-8478-97d83520d9ec","nodeVersion":"v22.23.3","platform":"win32","architecture":"x64","head":"7dafde8c3b4a68fbeb99c24e38eea2d35ab20dab","runId":"37193608959","runAttempt":"1","...
      [validation-phase] {"schema":"a1-validation-phase-v1","fixture":"release-command-fixture","invocation":"c2378a86-15aa-49e9-8478-97d83520d9ec","nodeVersion":"v22.23.3","platform":"win32","architecture":"x64","head":"7dafde8c3b4a68fbeb99c24e38eea2d35ab20dab","runId":"37193608959","runAttempt":"1","...
      [validation-phase] {"schema":"a1-validation-phase-v1","fixture":"release-command-fixture","invocation":"c2378a86-15aa-49e9-8478-97d83520d9ec","nodeVersion":"v22.23.3","platform":"win32","architecture":"x64","head":"7dafde8c3b4a68fbeb99c24e38eea2d35ab20dab","runId":"37193608959","runAttempt":"1","...
      [validation-phase] {"schema":"a1-validation-phase-v1","fixture":"release-command-fixture","invocation":"c2378a86-15aa-49e9-8478-97d83520d9ec","nodeVersion":"v22.23.3","platform":"win32","architecture":"x64","head":"7dafde8c3b4a68fbeb99c24e38eea2d35ab20dab","runId":"37193608959","runAttempt":"1","...
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 954^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mresizes in a real cold worker while the UI thread progresses ^[[33m 2180^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22mpreserves an already-small 3840x2160 PNG byte-for-byte without decoding it ^[[33m 467^[[2mms^[[22m^[[39m
      ... 37 more lines in the run log
      ```

  - Lane Publication result failed in job `Publication result` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]Process completed with exit code 1.
      ```

  - Last successful Publish run: [#5](https://github.com/timurproko/a1/actions/runs/37112403859) on `3b3d2a4`; 6 `develop` commits since:
    - `7dafde8` docs(readme): pick dark-mode art via picture sources (#668)
    - `4c30994` fix(guardian): restore the terminal and print a resume hint when a1 is killed (#667)
    - `4e8986a` chore(pi): upgrade pinned Pi to 1.0.0 (#658)
    - `cf5f053` docs(readme): keep the hero mark still and link only it to the site (#666)
    - `6860352` docs(readme): add animated mark, section art, and browser preview (#665)
    - `16b4758` fix(update): make self-update upgrades reliable (#664)
