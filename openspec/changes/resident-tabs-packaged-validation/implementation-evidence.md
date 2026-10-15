# Implementation evidence

## Failure evidence

- Development publication run 38742695792 (and 38740306508) on `491c2151`: `session-resume.integration.test.ts` failed on `linux-node24` with `a1-terminal-host: read outer terminal size: Resource temporarily unavailable (os error 11)` on every launch and `expected 2 to be 1` for invalid targets, and on `win32-node24` with readiness timeouts whose output shows the tab strip and the `Trust project folder?` dialog inside the tab. `darwin-node24` passed all 7 tests.
- #750 pull-request run 38705725246, job "Pi release and resume integration" (Windows, `windows-2025-vs2026`): the same suite passed, 7 tests in 46 s. The candidate's only native file was `package/dist/native/win32-x64/process-guardian.exe` (`Repaired native executable modes`), so every launch fell back with `terminal host not installed`.

## Local focused evidence

On Windows Node 24, at the implementation commit:

- `npx vitest run test/foundation/resident-tabs/resident-tabs.test.ts test/repository-governance/validation-scopes.test.ts test/repository-governance/validation-receipt-workflows.test.ts test/repository-governance/validation-tier.test.ts test/repository-governance/release-pipeline-policy.test.ts test/repository-governance/full-regression-policy.test.ts`: 6 files, 74 tests passed.
- `npm run preflight` passed every gate on the committed head (base `fd688d3d`, 20 changed paths, 11 steps); its changed-test step passed 82 files and 998 tests. The first run failed typecheck because the new `validation-scopes.mjs` had no declaration; `validation-scopes.d.mts` fixed it.
- The release terminal host is not built locally (endpoint protection quarantines its Zig build), so the host build, the fail-closed packing check, and the packaged session-resume suite are proven in CI only.
