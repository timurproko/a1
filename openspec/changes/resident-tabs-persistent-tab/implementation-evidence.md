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

Pending `npm run test:terminal-host`, the role integration fixture, Node validation, and physical-survival evidence.

## CI Linux x64

Pending `npm run test:terminal-host`, the role integration fixture, Node validation, and physical-survival evidence.

## CI macOS arm64

Pending `npm run test:terminal-host`, the role integration fixture, Node validation, and physical-survival evidence.
