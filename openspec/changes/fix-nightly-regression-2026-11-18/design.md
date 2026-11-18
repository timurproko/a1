## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #97](https://github.com/timurproko/a1/actions/runs/44239325683) (attempt 1, schedule) on `ad3dd37` at 2026-11-18T04:43:48Z:
  - `vitest-full-without-isolated` (`architecture`, `dependency-policy`, `dist-integration`, `documentation-full`, `fast-remainder`, `fast-resource-sensitive`, `history-compatibility`, `image-compatibility`, `launch-integration`, `naming-full`, `package-contracts`, `package-smoke`, `package-startup`, `pi-engine-conformance`, `release-update`, `rendering-stability`, `typecheck`, `unix-release`, `update-performance`, `update-predecessor`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node22 (core shard), windows-2025-node24 (core shard) with exit 1.
    - Command: `npx vitest run --exclude test/foundation/release/package-surface.test.ts --exclude test/foundation/release/session-resume.integration.test.ts --exclude test/foundation/release/package-install.integ...`
    - Log excerpt:

      ```text
      Published installer smoke: acquire-installer: npm failed [redacted]
      Published installer smoke: install-application: npm failed [redacted]
      Published installer smoke: verify-manifest: published installer selected the wrong application package
      Published installer smoke: launch-application: npm failed [redacted]
      Published installer smoke: install-application: published installer transcript is invalid
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke: update-predecessor: replacement failed
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke passed on darwin/arm64.
      Published installer smoke: update-predecessor: replacement failed
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (1ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (0ms)
      [published installer] update-predecessor failed (0ms)
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (0ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] install-application passed (1ms)
      [published installer] acquire-installer failed (1ms)
      Published installer smoke: acquire-installer: spawn ENOENT
      [published installer] acquire-installer started (timeout=120000ms)
      [published installer] acquire-installer passed (1ms)
      [published installer] install-application started (timeout=300000ms)
      [published installer] update-predecessor failed (1ms)
      ... 246 more lines in the run log
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
      git version 2.56.1
      Temporarily overriding HOME='/home/runner/work/_temp/a6ac27c2-c2e7-49f6-a6fc-f61462f883f1' before making global git config changes
      ```

  - Last successful Full regression run: [#93](https://github.com/timurproko/a1/actions/runs/43552568568) on `c362c4e`; 47 `develop` commits since:
    - `ad3dd37` fix: explain publication runner allocation failures (#972)
    - `d238687` fix: control automatic names without sidebar rename (#971)
    - `4d5f208` fix: bootstrap dependencies before publication commands (#970)
    - `73058d6` fix(herdr): follow active agent projects through providers (#969)
    - `ec18980` feat: add generic Herdr A1 session integration (#968)
    - `a8fcf44` fix(viewport): make scrollbar content-independent (#967)
    - `0744623` chore(regression): repair the 2026-11-17 full regression failure (#964)
    - `eaf705b` fix(delivery): promote drafts despite stale base metadata (#966)
    - `21d3f60` fix: align publication details and retain resume diagnostics (#963)
    - `7c146a8` fix(ci): unify publication output boundaries (#962)
    - `fe2e7e0` fix(naming): improve session name dialog editing (#960)
    - `9c97455` fix(lifecycle): confirm Windows process liveness against the process table (#961)
    - `fb28fb8` fix(api): prune stale session control records (#959)
    - `8dc9767` fix(ci): separate publication workflow summary (#958)
    - `1b04aa6` fix(ci): budget published predecessor replacement (#957)
    - `74fd89e` fix(ci): recover develop publication with status (#956)
    - `2871e19` fix(ci): separate published install deadlines (#955)
    - `1188a5b` fix(release): include installer repair helper (#954)
    - `7a79a75` fix(ci): update publication counters while running (#953)
    - `26618ed` fix(release): fail stalled publication smoke faster (#952)
    - `a3e89fc` feat(release): show publication step progress (#951)
    - `e449cc6` fix(release): diagnose Windows publication regression (#949)
    - `cf8884d` chore(regression): repair the 2026-11-16 full regression failure (#950)
    - `5801865` fix(release): forensics for the Windows published-pair stall (#948)
    - `52ddae3` feat(api): session lifecycle and graceful exit control (#946)
    - `a87e847` fix(release): budget and evidence for Windows published-pair stall (#947)
    - `64709ce` fix(release): update publication status in place (#945)
    - `e8c7249` fix(release): repair Windows published-pair smoke (#943)
    - `af9d8e9` fix(release): align publication failure summaries (#944)
    - `5b0c7ff` fix(release): align publication status dots (#942)
    - ... 17 more
