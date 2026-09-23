## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Release #155](https://github.com/timurproko/a1/actions/runs/35838366882) (attempt 1, schedule) on `c37f420` at 2026-09-23T08:39:32Z:
  - Lane darwin-node24 failed in job `Validate darwin-node24` before producing owner outcomes (orchestration failure).
    - Log excerpt: none matched; read the run log.
  - Lane linux-node24 failed in job `Validate linux-node24` before producing owner outcomes (orchestration failure).
    - Log excerpt: none matched; read the run log.
  - Lane Publication result failed in job `Publication result` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
      ##[error]Process completed with exit code 1.
      ```

  - Last successful Release run: [#143](https://github.com/timurproko/a1/actions/runs/35500168747) on `7d26554`; 31 `develop` commits since:
    - `c37f420` style(modals): unify shortcut hint presentation (#546)
    - `99b7eb8` fix(ui): link session delivery PR in footer (#552)
    - `8653fa4` fix(ui): align steering above live status (#554)
    - `9d2074c` fix(ui): hide image resize guidance from prompts (#549)
    - `9ecb438` fix(ui): place command errors above prompt (#548)
    - `39b8df5` fix(ui): place thinking default after checkmark (#547)
    - `65f7e7c` fix(session-ui): restore prompt suggestion after draft deletion (#550)
    - `9fa1e23` fix(ci): limit PR full regression to CI repairs (#551)
    - `91acd99` fix(ui): compact compaction progress label (#553)
    - `f7df762` fix(ui): place collapsed skills after settings (#545)
    - `b867271` feature(ci): run full regression inside repair and publishing PRs (#543)
    - `7e48174` fix(update): support owned non-default npm prefixes (#544)
    - `d24718c` fix(regression): restore publishing and consolidate nightly failures (#536)
    - `7b80f6a` chore(pi): upgrade pinned Pi to 0.87.0 (#537)
    - `6f8aa6f` feature(ui): show linked PR in status bar (#540)
    - `b26ad5d` fix(settings): remove search bottom gap (#541)
    - `98b88f3` fix(ui): mute selected autocomplete descriptions (#531)
    - `4605f4a` fix(release): gate startup profiles by the candidate's own capabilities (#532)
    - `b711d23` chore(github): add sponsor funding link (#539)
    - `535caf5` style(ui): align shortcut section headings (#535)
    - `3484636` fix(governance): clean generated settings metadata (#534)
    - `12d2944` style(settings): frame screen hierarchy (#530)
    - `6ae0615` fix(ui): stabilize touchpad scroll direction (#533)
    - `5f5a349` fix(ui): correct thinking selector presentation (#529)
    - `2226c9d` fix(regression): repair the 2026-09-21 release failure (#527)
    - `ba79473` chore(pi): upgrade pinned Pi to 0.86.1 (#526)
    - `8e22b03` fix(shell): offer /thinking and order the command menu like the engine (#528)
    - `d8a3db0` chore(pi): upgrade pinned Pi to 0.86.0 (#522)
    - `95216f1` feat(development): report missing build prerequisites by name (#524)
    - `f603b30` Remove pull request integration section from README (#525)
    - ... 1 more
