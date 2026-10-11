# Implementation evidence

Evidence is recorded by platform. A passing contracts-only build does not certify the native runtime.

## Local Windows x64

- `npm run typecheck`: passed.
- Focused resident-tabs, session-shell lifecycle, settings-app, and repository-governance Vitest suites: 124 passed.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --all-targets --features resident-fixtures`: passed.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo test --lib`: 31 passed.
- `npx openspec validate resident-tabs-persistent-tab --strict --no-interactive`: passed.
- `npm run check:architecture`: passed.
- Full native execution: pending CI. Local full Zig execution was stopped after managed antivirus blocked a vendored malformed-image fixture; no antivirus exclusion was added.
- Physical terminal-close, OpenSSH-loss, retained-output, reattach-input, forced-attach-kill, `/quit`, and double-`Ctrl+C` evidence: pending an isolated worker with a CI-built artifact.

## CI Windows x64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652524](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652524).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- Node validation and physical terminal-close, OpenSSH-loss, and parent-shell restoration evidence remain pending.

## CI Linux x64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652565](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652565).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- Node validation and physical terminal-close, SSH-loss, and parent-shell restoration evidence remain pending.

## CI macOS arm64

- `npm run test:terminal-host`: passed in [run 38151058837, job 114504652528](https://github.com/timurproko/a1/actions/runs/38151058837/job/114504652528).
- The server/holder/attach pseudoterminal fixture passed create, input, double-`Ctrl+C` detach, output while detached, reattach, forced attach-process loss, retained surface, and input after reattach.
- Node validation and physical Terminal.app-close, SSH-loss, and parent-shell restoration evidence remain pending.
