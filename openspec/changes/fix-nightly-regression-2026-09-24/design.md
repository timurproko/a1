## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- The failed assertion counted every synchronized terminal frame while combining streamed-content cadence with an `agent_start` lifecycle transition. The lifecycle transition constructs the independently animated Working status and requests its own render, so Windows/Node 22 scheduling could produce a second valid status frame inside the test's wall-clock wait. No product regression or introducing product commit was identified; the failed lane exposed latent environmental coupling in the test.
- Keep production behavior unchanged. The integration test now advances its injected stream clock past startup and begins with the streaming content event, while dedicated status-animation tests continue to cover lifecycle rendering independently.
- Preserve the exact one-frame initial stream bound and strengthen the later checks: immediate input leaves no deferred stream frame, and final content contributes exactly one immediate frame. No timeout, budget, assertion, or coverage is relaxed.
- The first finalized head exposed a second race: finalization's body-edit event carried the finalized fence but was cancelled by a later-arriving synchronize event whose immutable payload still held the active fence. Readiness trusted that stale body and deferred every selected lane on the already-finalized exact head.
- Keep the event head and base as immutable authority, but read mutable body and draft metadata from GitHub at readiness execution. Current metadata is accepted only when its pull number, head, and base still equal the event identity; drift, unavailability, or malformed current metadata fails closed. The trusted base copy remains dependency-free and requests only pull-request read permission.
- Reconciliation found that `origin/develop` commit `126d5c23` had independently introduced the current pull-request read for association enforcement. Reuse that trusted reader and factor its exact event-identity check into the shared readiness classifier instead of maintaining a second metadata path.

## Evidence

- The failed Windows 2025/Node 22 lane identified `bounds custom-viewport terminal frames for a burst and flushes final content immediately` at `session-shell-viewport.test.ts:552`: one synchronized frame was expected and two were observed. The other three native lanes passed, and the aggregate failure was downstream missing-lane evidence.
- Repeated focused validation on Windows/Node 24 passed 20 of 20 independent process runs of the corrected test, each retaining the exact initial and final frame assertions.
- `npx vitest run test/app/session-shell/session-shell-viewport.test.ts test/app/session-shell/stream-presentation-coalescer.test.ts` passed both files and all 31 tests.
- `npm run typecheck` passed.
- `npx vitest run test/repository-governance/development-validation-readiness.test.ts test/repository-governance/impact-aware-validation-workflows.test.ts test/repository-governance/pr-full-regression.test.ts test/repository-governance/openspec-association-policy.test.ts` passed all 68 readiness, workflow, selection, and association tests after target reconciliation.
- `npx openspec validate fix-nightly-regression-2026-09-24 --strict` passed with the continuous-integration requirement delta.
- Initial finalization produced exact head `c1859929`, but Development run [#35979375044](https://github.com/timurproko/a1/actions/runs/35979375044) consumed the stale active fence from its synchronize payload and reported `awaiting-finalization`; the finalized-body run [#35979369981](https://github.com/timurproko/a1/actions/runs/35979369981) had been cancelled by concurrency. This is the reproduced event-ordering failure addressed by current-metadata resolution.
- The selected exact-head PR Full regression and `Development validation required` remain pending renewed trusted finalization; no implementation gap is known. Numbered-package nightly recovery is independent and not claimed by this correction.

- Run [Full regression #39](https://github.com/timurproko/a1/actions/runs/35971693488) (attempt 1, schedule) on `93f6928` at 2026-09-24T07:49:09Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-containment`, `update-performance`, `update-predecessor`) failed on windows-2025-node22 with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
       ^[[31m❯^[[39m test/app/session-shell/session-shell-viewport.test.ts ^[[2m(^[[22m^[[2m26 tests^[[22m^[[2m | ^[[22m^[[31m1 failed^[[39m^[[2m)^[[22m^[[33m 5415^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m OwnedUiSessionShell viewport and streaming^[[2m > ^[[22mquietly recovers combined history contention and a 16,384-update assistant/tool burst with interactive input ^[[33m 3666^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell viewport and streaming^[[2m > ^[[22mrenders large text as one chip through shortcut and records the full prompt^[[32m 88^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell viewport and streaming^[[2m > ^[[22mrenders large text as one chip through terminal and records the full prompt^[[32m 81^[[2mms^[[22m^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell viewport and streaming^[[2m > ^[[22mrenders large text as one chip through right-click and records the full prompt^[[32m 89^[[2mms^[[22m^[[39m
      ^[[31m     → expected 2 to be 1 // Object.is equality^[[39m
         ^[[32m✓^[[39m OwnedUiSessionShell viewport and streaming^[[2m > ^[[22mreuses a finalized block's rows until its revision, the width, the theme, or expansion changes^[[32m 14^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/repository-governance/validation-tier.test.ts ^[[2m(^[[22m^[[2m23 tests^[[22m^[[2m)^[[22m^[[33m 311^[[2mms^[[22m^[[39m
       ^[[32m✓^[[39m test/app/session-shell/transcript-content-retention.test.ts ^[[2m(^[[22m^[[2m31 tests^[[22m^[[2m)^[[22m^[[33m 3283^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m transcript content retention across renderer boundaries^[[2m > ^[[22msettles tool execution state when protected overload recovery finalizes the transcript (cancelled=true) ^[[33m 860^[[2mms^[[22m^[[39m
         ^[[33m^[[2m✓^[[22m^[[39m large screenshot preparation^[[2m > ^[[22madmits the real over-8-MiB source that previously failed before preparation ^[[33m 1219^[[2mms^[[22m^[[39m
      ... 45 more lines in the run log
      ```

  - Lane Full regression / Complete regression required failed in job `Full regression / Complete regression required` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
        if (jobsResult !== "success" || records.length !== FULL_LANES.length) throw new Error("complete-regression jobs or evidence are incomplete");
                                                                                    ^
      Error: complete-regression jobs or evidence are incomplete
          at requireFullLanes (file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:44:79)
          at file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:67:20
          at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
          at async node:internal/modules/esm/loader:647:26
      ##[error]Process completed with exit code 1.
      Post job cleanup.
      [command]/usr/bin/git version
      git version 2.55.0
      Temporarily overriding HOME='/home/runner/work/_temp/149a7e5a-ac8a-44db-976b-1803389b15c2' before making global git config changes
      ```

  - Last successful Full regression run: [#30](https://github.com/timurproko/a1/actions/runs/35576685488) on `95216f1`; 51 `develop` commits since:
    - `93f6928` fix(ui): compact and inset modal content (#573)
    - `00532de` fix(ui): block Pi fallback selection (#578)
    - `02d3b56` fix(ui): finish compaction progress (#577)
    - `66d91a0` fix(ui): separate scrollbar from transcript content (#576)
    - `69c1959` fix(ui): align copy feedback (#575)
    - `70b9ebd` fix(ui): keep prompt chips unbroken (#574)
    - `4bb30e1` fix(ui): show compaction progress immediately (#572)
    - `2e73283` ci: defer pull request validation until ready (#571)
    - `c66d6d1` fix(regression): repair the 2026-09-23 full regression failure (#559)
    - `0ad1ef8` feature(ui): select the complete session frame (#569)
    - `374c946` fix(ui): retain merged PR link in footer (#570)
    - `0ed21fb` style(status): animate progress labels (#568)
    - `718e2e4` feature(cli): simplify command spelling (#567)
    - `4735177` fix(ui): restore steering Alt+Up (#566)
    - `2fd59d4` fix: classify exited Windows guardian processes (#565)
    - `e019d94` docs(openspec): close stale clipboard and streaming changes (#564)
    - `d5b5dd7` fix(launch): make current release startup quiet and reliable (#563)
    - `d369a27` fix(ui): make changelog notice transient (#562)
    - `dd3680c` chore(pi): upgrade pinned Pi to 0.87.1 (#560)
    - `464f994` feat(workflow): require delivery worktree context (#558)
    - `9f5c347` fix(ui): simplify thinking and login descriptions (#555)
    - `ff361bf` fix(update): wait out transient package locks before replacing the tree (#557)
    - `e904bb3` style(dialogs): left-align shortcut hints (#556)
    - `c37f420` style(modals): unify shortcut hint presentation (#546)
    - `99b7eb8` fix(ui): link session delivery PR in footer (#552)
    - `8653fa4` fix(ui): align steering above live status (#554)
    - `9d2074c` fix(ui): hide image resize guidance from prompts (#549)
    - `9ecb438` fix(ui): place command errors above prompt (#548)
    - `39b8df5` fix(ui): place thinking default after checkmark (#547)
    - `65f7e7c` fix(session-ui): restore prompt suggestion after draft deletion (#550)
    - ... 21 more
