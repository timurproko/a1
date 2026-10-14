# Implementation evidence

Evidence is recorded independently by platform. Native role fixtures and the fidelity and latency harnesses run against the debug host each platform lane builds; they are process-integration evidence, not physical terminal-emulator certification, which remains a milestone 6 concern.

## Validated implementation head

Development validation run [38536888821](https://github.com/timurproko/a1/actions/runs/38536888821) passed on implementation head `2490854f833944acff74010c599c39fc496c41a0`.

The run passed every selected validation owner: native Windows, Linux, and macOS; PR core and affected unit owners; exact-package contracts; resource-sensitive tests; Pi release/resume; changed full-only integrations; Unix integrations on Linux and macOS; image/history compatibility; first-attempt startup budget; rendering; naming; changed-file documentation; and the aggregate diagnostic.

## Implementation coverage

### Two clients, quit, and detach (task 5.3)

- `native/terminal-host/tests/role_integration.rs` runs two attach clients against one tab: the competing client is a read-only viewer whose input never reaches the child, the original controller keeps input, and a double `Ctrl+C` detach prints `1 agent still running run a1 to return.` while restoring every enabled outer-terminal mode.
- `test/app/session-shell/session-shell-lifecycle.test.ts` covers resident `/quit` and empty-editor `Ctrl+D` detach routes, coalesced quit requests, and an unavailable or stale detach that keeps the session alive.
- An unacknowledged controller boundary completes after one second, so a terminal that filters the boundary marker cannot strand held input.

### Text-terminal fidelity (task 7.1)

`scripts/development/verify-terminal-fidelity.mjs` passed with no missing case on all three platforms for key encoding, kitty keys, text/IME encoding, mouse and pane-relative mouse, bracketed paste, selection, OSC 52, OSC 8, cursor shape, wide/combining Unicode, alternate screen, and image text fallback.

### Limits and concurrent starts (task 8.2)

`ten_concurrent_tab_starts_respect_the_server_limit` passed in the native role suite on all three platforms.

### Performance budgets (task 9.1)

The holder, server writers, and attach client wake on their producers instead of fixed 8 ms sleep-polls; Windows pipe readiness polls at 1 ms after traffic under a 1 ms process timer period; and standby promotion is signalled out of band as well as in band, because Windows ConPTY may drop the in-band marker.

p95 milliseconds, measured / budget:

| Metric | Windows x64 | Linux x64 | macOS arm64 |
|---|---|---|---|
| Cold launch to first input | 897.3 / 3300 | 63.0 / 3300 | 318.3 / 3300 |
| Matching-standby creation | 66.9 / 250 | 95.9 / 250 | 15.4 / 250 |
| Reattach first paint | 74.0 / 300 | 4.5 / 300 | 11.1 / 300 |
| Reattach first accepted input | 76.1 / 400 | 4.9 / 400 | 12.2 / 400 |
| Input-to-process | 3.7 / 16 | 0.4 / 16 | 0.9 / 16 |
| Output-to-present | 11.6 / 33 | 0.6 / 33 | 1.2 / 33 |

No budget was missed on any platform.

## CI Windows x64

- [Native terminal host (Windows x64)](https://github.com/timurproko/a1/actions/runs/38536888821/job/115762047215) passed.
- Native library/model result: 65 passed, 1 ignored, 0 failed.
- Native executable role integration: 10 passed, 0 failed.
- Resident Node suite: 7 files / 77 tests passed.
- Fidelity, latency, bounded decoder fuzzing, and terminal host probes passed.

## CI Linux x64

- [Native terminal host (Linux x64)](https://github.com/timurproko/a1/actions/runs/38536888821/job/115762047160) passed.
- Native library/model result: 66 passed, 1 ignored, 0 failed.
- Native executable role integration: 10 passed, 0 failed.
- Resident Node suite: 7 files / 77 tests passed.
- Fidelity, latency, bounded decoder fuzzing, and terminal host probes passed.

## CI macOS arm64

- [Native terminal host (macOS arm64)](https://github.com/timurproko/a1/actions/runs/38536888821/job/115762047158) passed.
- Native library/model result: 65 passed, 1 ignored, 0 failed.
- Native executable role integration: 10 passed, 0 failed.
- Resident Node suite: 7 files / 77 tests passed.
- Fidelity, latency, bounded decoder fuzzing, and terminal host probes passed.

## Direct launches and settings (task 10.2)

- `test/foundation/resident-tabs/resident-tabs.test.ts` routes bare A1 through the resident host while `a1 solo` and `a1 pi` stay direct.
- `test/ui/settings/manager.test.ts` omits the Tabs section when a launch hides its owned settings, which `bin/ui.js` does for `a1 solo`; `a1 pi` uses Pi's own interface.
- `openspec validate resident-tabs-tab-ux --strict` passes, and code documentation and naming governance report no violations.

## Skips and interpretation

- The ignored native test is the existing manual stress target.
- Local native builds are not part of this evidence: the host builds only in CI. `npm run proof:terminal-host:ci` reran the fidelity and latency proofs locally on Windows against CI-built hosts while diagnosing the budgets.
