## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- **What failed:** every Windows `package` and `predecessor` shard rejected its own exact-package handoff (`handoff-rejected`, "malformed or contradicts the validation plan"). Preparation installed the candidate and wrote a handoff naming `package-startup`, `package-contracts`, and `update-predecessor`, while the `package` shard plans only the first two and the `predecessor` shard only the third. With four shard jobs failing, `Complete regression required` saw incomplete lane evidence.
- **Why:** introduced by `ee097cf` (#789). It changed `run-validation-tier.mjs --prepare-exact-package` from preparing the canonical plan to preparing the shard plan, which exists only when `--full-shard` is passed, but the sharded "Prepare the exact package" steps in `full-regression-shared.yml` and in `publish.yml` (`validate_windows_shard`) never passed it. Preparation therefore planned the canonical consumers. Not environmental.
- **Fix:** both sharded preparation steps pass `--full-shard "${{ matrix.shard }}"`, so each shard prepares exactly the consumers it runs. Handoff validation, consumers, and coverage are unchanged; the unsharded sequential preparations keep the canonical plan.
- **Regression evidence:** the full-regression workflow policy test now requires both sharded preparation steps to pass the matrix shard, so the preparation and consumer plans cannot drift apart again.

## Evidence

- Run [Full regression #66](https://github.com/timurproko/a1/actions/runs/39086949176) (attempt 1, schedule) on `cc0a011` at 2026-10-18T01:33:50Z:
  - `exact-package-preparation` (`package-contracts`, `package-startup`) failed on windows-2025-node22 (package shard), windows-2025-node22 (predecessor shard), windows-2025-node24 (package shard), windows-2025-node24 (predecessor shard) with exit 1; preparation: handoff-rejected.
    - Command: `npm install --global <exact-candidate>`
    - Log excerpt:

      ```text
      ##[error]Process completed with exit code 1.
      ##[group]Run if [ ! -f "$STARTUP_PERFORMANCE_RESULT" ]; then
      ^[[36;1mif [ ! -f "$STARTUP_PERFORMANCE_RESULT" ]; then^[[0m
      ^[[36;1m  echo "No first-attempt startup evidence was produced for $PLATFORM." >> "$GITHUB_STEP_SUMMARY"^[[0m
      ^[[36;1m  exit 0^[[0m
      ^[[36;1m  echo "Validation orchestration failed before producing owned outcomes." >> "$GITHUB_STEP_SUMMARY"^[[0m
      ^[[36;1mfi^[[0m
      shell: C:\Program Files\Git\bin\bash.EXE --noprofile --norc -e -o pipefail {0}
      env:
        FULL_SOURCE: cc0a011dc4593e45687222077f4d87a1c27c143a
      ```

  - Lane Full regression / Complete regression required failed in job `Full regression / Complete regression required` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
        if (jobsResult !== "success" || records.length !== FULL_LANES.length) throw new Error("complete-regression jobs or evidence are incomplete");
                                                                                    ^
      Error: complete-regression jobs or evidence are incomplete
          at requireFullLanes (file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:131:79)
          at file:///home/runner/work/a1/a1/scripts/release/full-regression-evidence.mjs:174:20
          at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
          at async node:internal/modules/esm/loader:647:26
      ##[error]Process completed with exit code 1.
      Post job cleanup.
      [command]/usr/bin/git version
      git version 2.55.0
      Temporarily overriding HOME='/home/runner/work/_temp/a701aae1-6bda-4cd3-b212-e07fe79f853b' before making global git config changes
      ```

  - Local reproduction on `cc0a011` plus `develop`: with `VALIDATION_SELECTION_JSON='["full-release"]'`, `run-validation-tier.mjs --plan` names exact-package consumers `package-startup,package-contracts,update-predecessor` (the set the failed preparation logged), `--plan --full-shard package` names `package-startup,package-contracts`, and `--plan --full-shard predecessor` names `update-predecessor`. The focused full-regression and release pipeline policy tests pass with the fix.
  - Last successful Full regression run: [#65](https://github.com/timurproko/a1/actions/runs/38991464211) on `2148ffa`; 11 `develop` commits since:
    - `cc0a011` feature(native): host every native component inside the Node runtime (#794)
    - `19f3479` chore(delivery): allow unbounded progress items (#800)
    - `d132acf` fix: stabilize resident multi-agent UX (#798)
    - `321b834` chore(delivery): re-promote a finalized pull request returned to draft (#799)
    - `488a97f` fix(tabs): read the attach settings file without creating it (#797)
    - `ce3e1b3` fix(resident): restore solo interaction parity (#792)
    - `a1ac477` chore(delivery): link Claude Code worktrees through a repository hook (#796)
    - `e5bcf46` feat(tabs): polish resident tab strip (#791)
    - `f370434` feature: copy prompt and status selections (#793)
    - `ee097cf` chore(ci): cut the CI critical path (#789)
    - `0b6ef5e` fix: send image prompts in resident tabs (#790)
