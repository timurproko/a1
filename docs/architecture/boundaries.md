# Source boundaries

- `domain`: dependency-free identities, state, capabilities, commands, events, and driver ports.
- `protocol`: additive wire messages, framing, request correlation, snapshots, revisions, and the UI client.
- `drivers/terminal`: the only PTY/emulator adapter; terminal output is opaque.
- `storage`: SQLite migrations and control-plane repositories.
- `supervisor`: endpoint ownership, durable orchestration, revisions, and worker generations.
- `presentation`: the only source boundary allowed to import the AddOne TUI toolkit.
- `ui`: serializable application state, input routing, rendering orchestration, and protocol attachment. It cannot spawn agents.
- `test-harness`: hermetic contexts, deterministic fixtures, PTY runner, scenarios, and artifact bundles.

`scripts/check-architecture.mjs` enforces the high-risk dependency rules. Private Pi distribution imports and durable `globalThis` registries are forbidden everywhere.
