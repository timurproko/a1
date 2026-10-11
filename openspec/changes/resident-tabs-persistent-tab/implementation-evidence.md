# Implementation evidence

Evidence is recorded by platform. A passing contracts-only build does not certify the native runtime, and the pseudoterminal fixture does not replace the physical terminal-close and SSH-loss checks in task 7.2.

## Local Windows x64

Validated on branch head `05ff5680` after reconciling with `origin/develop`:

- `npm test`: passed the selected fast and resource-sensitive suites; the resource-sensitive phase reported 25 files and 332 tests passed.
- Focused resident-tabs, session-shell lifecycle, settings, settings-app, composition, and launch-guardian suites: 11 files and 202 tests passed.
- `npm run typecheck`: passed.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --all-targets --features resident-fixtures`: passed.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo test --lib`: 31 passed.
- `npx openspec validate resident-tabs-persistent-tab --strict --no-interactive`: passed.
- Architecture, full naming, code-documentation, docs-governance, and repository-governance checks: passed.
- Full local Zig/native execution was not attempted. Managed antivirus previously blocked a vendored malformed-image fixture; the downloaded Zig executable, archive, and temporary build directory remain removed, and no antivirus exclusion was added.
- Physical Windows Terminal-close, Windows OpenSSH-loss, and parent-shell restoration evidence: pending an isolated worker with a CI-built artifact.

## CI Windows x64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652524](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652524).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- A fresh run for head `05ff5680`, including serialized attach admission, keyboard negotiation, visible input rejection, and cold holder adoption after server death, is pending.
- Physical Windows Terminal-close, Windows OpenSSH-loss, and parent-shell restoration evidence remains pending.

## CI Linux x64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652565](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652565).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- A fresh run for head `05ff5680`, including serialized attach admission, keyboard negotiation, visible input rejection, and cold holder adoption after server death, is pending.
- Physical terminal-emulator close, SSH-loss, and parent-shell restoration evidence remains pending.

## CI macOS arm64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652528](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652528).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- A fresh run for head `05ff5680`, including serialized attach admission, keyboard negotiation, visible input rejection, and cold holder adoption after server death, is pending.
- Physical Terminal.app-close, SSH-loss, and parent-shell restoration evidence remains pending.

## Physical acceptance still required

Before this change can be accepted or PR #746 can leave draft, task 7.2 must be run on isolated Windows, macOS, and Linux workers with the CI-built host selected through `A1_TERMINAL_HOST_PATH`. Each platform record must show terminal-window loss and SSH-session loss while work continues, retained output on reattach, successful input after reattach, `/quit` and double-`Ctrl+C` detach, and a usable parent shell after forced attach death. Empty-editor `Ctrl+D` is covered by the lifecycle suite but should also be exercised during the physical pass.
