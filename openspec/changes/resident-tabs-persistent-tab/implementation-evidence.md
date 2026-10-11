# Implementation evidence

Evidence is recorded by platform. A passing contracts-only build does not certify the native runtime, and the pseudoterminal fixture does not replace the physical terminal-close and SSH-loss checks in task 7.2.

## Local Windows x64

Validated locally across the final implementation sequence:

- `npm test` on `ead00179`: passed the selected fast and resource-sensitive suites; the resource-sensitive phase reported 25 files and 332 tests passed.
- Focused post-reconciliation resident-tabs, session-shell lifecycle, settings, settings-app, composition, and launch-guardian suites: 11 files and 202 tests passed.
- `npm run typecheck`: passed.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --all-targets --features resident-fixtures`: passed.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo test --lib`: 32 passed, including the Windows owner-only ACL assertion.
- `npx openspec validate resident-tabs-persistent-tab --strict --no-interactive`: passed.
- Architecture, full naming, code-documentation, docs-governance, and repository-governance checks: passed.
- Full local Zig/native execution was not attempted. Managed antivirus previously blocked a vendored malformed-image fixture; the downloaded Zig executable, archive, and temporary build directory remain removed, and no antivirus exclusion was added.
- Physical Windows acceptance used the isolated `.artifacts/physical-profile` profile and the CI-built artifact for head `09028be5` from [run 38159593912](https://github.com/timurproko/a1/actions/runs/38159593912).
- Windows Terminal tab closure while a one-line-per-second command was active: passed. The verified server and holder survived, output advanced from the pre-close prefix through `resident-59`, and reattach restored that output and the same A1 session.
- Forced attach-process termination: passed. The server and holder remained alive and the surviving Git Bash parent accepted `printf 'shell-ok\\n'`.
- Post-reattach submission: inconclusive and blocking. A prompt was visible in the restored editor and history navigation plus `Ctrl+J` produced visible editor changes, but Enter did not submit in that state. This does not establish that the native attach dropped Return; editor state, retained rendering, and transport handling must be isolated before a fix is selected.
- Windows OpenSSH-loss, `/quit`, double-`Ctrl+C`, empty-editor `Ctrl+D`, and conclusive input-after-reattach evidence remain pending.

## CI Windows x64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652524](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652524).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- The expanded role fixture, including concurrent server startup, serialized attach admission, mode enable/restore, keyboard negotiation, nonzero second-client refusal, retained output, Windows job-close launch-tree loss, and cold holder adoption after server death, passed for implementation head `7bdcec50` in [run 38156862241, job 114521630855](https://github.com/timurproko/a1/actions/runs/38156862241/job/114521630855).
- Exact-head development validation, including the Windows holder-start correction, passed in [run 38159593912](https://github.com/timurproko/a1/actions/runs/38159593912).
- Physical Windows details and the blocking inconclusive submission result are recorded in the Local Windows x64 section.

## CI Linux x64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652565](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652565).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- The expanded role fixture, including concurrent server startup, serialized attach admission, mode enable/restore, keyboard negotiation, nonzero second-client refusal, retained output, `SIGHUP` launch-session loss, and cold holder adoption after server death, passed for implementation head `7bdcec50` in [run 38156862241, job 114521630913](https://github.com/timurproko/a1/actions/runs/38156862241/job/114521630913).
- Physical terminal-emulator close, SSH-loss, and parent-shell restoration evidence remains pending.

## CI macOS arm64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652528](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652528).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- The expanded role fixture, including concurrent server startup, serialized attach admission, mode enable/restore, keyboard negotiation, nonzero second-client refusal, retained output, `SIGHUP` launch-session loss, and cold holder adoption after server death, passed for implementation head `7bdcec50` in [run 38156862241, job 114521630943](https://github.com/timurproko/a1/actions/runs/38156862241/job/114521630943).
- Physical Terminal.app-close, SSH-loss, and parent-shell restoration evidence remains pending.

## Physical acceptance still required

Before this change can be accepted or PR #746 can leave draft, task 7.2 must be run on isolated Windows, macOS, and Linux workers with the CI-built host selected through `A1_TERMINAL_HOST_PATH`. Each platform record must show terminal-window loss and SSH-session loss while work continues, retained output on reattach, successful input after reattach, `/quit` and double-`Ctrl+C` detach, and a usable parent shell after forced attach death. Empty-editor `Ctrl+D` is covered by the lifecycle suite but should also be exercised during the physical pass.
