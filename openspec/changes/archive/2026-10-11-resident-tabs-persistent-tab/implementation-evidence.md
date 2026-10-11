# Implementation evidence

Evidence is recorded by platform. A passing contracts-only build does not certify the native runtime. Milestone 2 has complete Windows physical evidence; its macOS and Linux native role fixtures are implementation evidence, not physical certification, which is explicitly deferred to milestone 6 (`resident-tabs-certification`).

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
- Input after reattach: passed on a clean diagnostic reattach. History navigation worked and both Enter and its carriage-return equivalent `Ctrl+M` submitted successfully. An earlier non-submitting restored editor state did not reproduce and was not attributed to native Return handling; the speculative key-event change was reverted.
- Double-`Ctrl+C` detach: passed from a verified clean server/holder/attach state and printed the exact `1 tab still running · run a1 to return` notice.
- `/quit` detach: passed after reattach and printed the exact resident-tab notice.
- Empty-editor `Ctrl+D` detach: passed after reattach and printed the exact resident-tab notice.
- Windows OpenSSH loss: passed using the Windows system OpenSSH client, key authentication, and a disposable loopback SSH/ConPTY endpoint bound only to `127.0.0.1`. Closing the complete Git Bash tab removed the SSH attach client while the verified server and holder remained alive; local reattach restored the same `ask me 1 questions` content and accepted a new prompt.

## CI Windows x64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652524](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652524).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- The expanded role fixture, including concurrent server startup, serialized attach admission, mode enable/restore, keyboard negotiation, nonzero second-client refusal, retained output, Windows job-close launch-tree loss, and cold holder adoption after server death, passed for implementation head `7bdcec50` in [run 38156862241, job 114521630855](https://github.com/timurproko/a1/actions/runs/38156862241/job/114521630855).
- Exact-head development validation, including the Windows holder-start correction, passed in [run 38159593912](https://github.com/timurproko/a1/actions/runs/38159593912).
- Physical Windows details are recorded in the Local Windows x64 section.

## CI Linux x64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652565](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652565).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- The expanded role fixture, including concurrent server startup, serialized attach admission, mode enable/restore, keyboard negotiation, nonzero second-client refusal, retained output, `SIGHUP` launch-session loss, and cold holder adoption after server death, passed for implementation head `7bdcec50` in [run 38156862241, job 114521630913](https://github.com/timurproko/a1/actions/runs/38156862241/job/114521630913).
- Physical terminal-emulator close, `sshd` loss, and parent-shell restoration were not run because no isolated Linux worker was available. They remain a disclosed certification gap deferred to milestone 6; the CI fixture is not relabeled as physical evidence.

## CI macOS arm64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652528](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652528).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- The expanded role fixture, including concurrent server startup, serialized attach admission, mode enable/restore, keyboard negotiation, nonzero second-client refusal, retained output, `SIGHUP` launch-session loss, and cold holder adoption after server death, passed for implementation head `7bdcec50` in [run 38156862241, job 114521630943](https://github.com/timurproko/a1/actions/runs/38156862241/job/114521630943).
- Physical Terminal.app close, `sshd` loss, and parent-shell restoration were not run because no isolated macOS worker was available. They remain a disclosed certification gap deferred to milestone 6; the CI fixture is not relabeled as physical evidence.

## Milestone 2 acceptance boundary

The maintainer approved milestone 2 to proceed with complete isolated Windows physical evidence plus the existing macOS and Linux native launch-tree/`SIGHUP` role fixtures. This accepts delivery of the default-off implementation; it does not certify physical survival on macOS or Linux and does not permit those missing results to be inferred from Windows or CI. Milestone 6 (`resident-tabs-certification`) retains the exact-package Terminal.app/Linux-emulator, `sshd`-loss, reattach-input, detach, and parent-shell physical gates before certification or any default-on consideration on those platforms.
