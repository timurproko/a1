# Source boundaries during terminal redesign

- `domain`: dependency-free identities, lifecycle state, capabilities, commands, events, and temporary lifecycle-only driver ports.
- `protocol`: additive control framing, request correlation, snapshots, revisions, and release negotiation. No terminal input bytes, cells, modes, or render transactions.
- `storage`: SQLite migrations and control-plane repositories. Historical surface columns may remain in schema version 1 but have no runtime authority.
- `supervisor`: endpoint ownership, durable lifecycle orchestration, revisions, and generation identity. It has no resident terminal state during cleanup.
- `bootstrap`, release, update, and version modules: dependency-light package lifecycle boundaries.

The retired `drivers/terminal`, `host-terminal`, `presentation`, UI terminal relay, and `test-harness` trees are forbidden. `scripts/check-architecture.mjs` rejects their reintroduction, `node-pty`, `@xterm/headless`, Pi TUI presentation imports, application-specific terminal branches, private Pi imports, and durable `globalThis` registries.

Transparent replacement code will be added later as an explicit foreground broker boundary with no ordinary terminal byte path through AddOne. Composed code is prohibited until a standalone authoritative core passes its cross-platform generic conformance gate.
