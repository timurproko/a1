# Implementation evidence

## Failure evidence

- Development publication run 38742695792 (and 38740306508) on `491c2151`: `session-resume.integration.test.ts` failed on `linux-node24` with `a1-terminal-host: read outer terminal size: Resource temporarily unavailable (os error 11)` on every launch and `expected 2 to be 1` for invalid targets, and on `win32-node24` with readiness timeouts whose output shows the tab strip and the `Trust project folder?` dialog inside the tab. `darwin-node24` passed all 7 tests.
- #750 pull-request run 38705725246, job "Pi release and resume integration" (Windows, `windows-2025-vs2026`): the same suite passed, 7 tests in 46 s. The candidate's only native file was `package/dist/native/win32-x64/process-guardian.exe` (`Repaired native executable modes`), so every launch fell back with `terminal host not installed`.

## Local focused evidence

On Windows Node 24, at the implementation commit:

- `npx vitest run test/foundation/resident-tabs/resident-tabs.test.ts test/repository-governance/validation-scopes.test.ts test/repository-governance/validation-receipt-workflows.test.ts test/repository-governance/validation-tier.test.ts test/repository-governance/release-pipeline-policy.test.ts test/repository-governance/full-regression-policy.test.ts`: 6 files, 74 tests passed.
- `npm run preflight` passed every gate on the committed head (base `fd688d3d`, 20 changed paths, 11 steps); its changed-test step passed 82 files and 998 tests. The first run failed typecheck because the new `validation-scopes.mjs` had no declaration; `validation-scopes.d.mts` fixed it.
- The release terminal host is not built locally (endpoint protection quarantines its Zig build), so the host build, the fail-closed packing check, and the packaged session-resume suite are proven in CI only.

## CI evidence

Diagnostic Development validation run 38755755118 on head `b35a5e13` succeeded; every selected lane passed, including all three native terminal-host lanes and all three resident chaos lanes.

| Lane | `packsCandidate` | `verify-local-native-artifacts` | `session-resume.integration.test.ts` | Duration (#750 PR run) |
| --- | --- | --- | --- | --- |
| Pi release and resume integration (Windows x64) | true | passed | 7 passed, 66 s | 11.3 min (4.0) |
| Unix integration (Linux x64) | true | passed | 7 passed, 26 s | 6.6 min (2.2) |
| Unix integration (macOS arm64) | true | passed | 7 passed, 28 s | 7.0 min (2.3) |
| Exact-package contracts (Windows x64) | true | passed | not selected | 15.3 min (5.9) |
| First-attempt startup budget (Windows x64) | true | passed | not selected | 14.3 min (7.4) |

The Windows candidate's packed native files were `package/dist/native/win32-x64/process-guardian.exe` and `package/dist/native/win32-x64/terminal-host.exe`; #750's held only the guardian. Each packing lane ran `npm run build:terminal-host` before recording the build. These durations are cold-cache: every job then used a job-scoped `key`, and a pull request cannot read another branch's cache. The cache now uses `shared-key: terminal-host-release`, shared with publication's host build on `develop`.
