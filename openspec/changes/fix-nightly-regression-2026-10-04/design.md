## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

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
