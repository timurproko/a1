# Architecture boundaries

## Terminal ownership

The current interactive path is:

```text
mutable a1/addone entry
  -> verified immutable release
  -> foreground lease and broker
  -> child with inherited physical terminal handles
```

After handoff, AddOne does not read ordinary terminal input, parse child output, render cells, infer frames, synthesize terminal responses, or emit display control. The child and physical terminal own terminal behavior. AddOne owns validated launch intent, one exclusive foreground lease, native process identity, lifecycle outcome, and bounded cleanup.

Transparent mode has no AddOne-authoritative terminal surface, internal pane, virtual scrollback, inactive resident tab, or visual reconnection. A future feature that requires those properties must introduce and certify a separate composed-terminal authority; it must not weaken or silently intercept transparent mode.

## Current module responsibilities

- `domain`: dependency-free transparent launch, process identity, lifecycle, and lease contracts.
- `protocol`: additive control handshake, bounded line framing, request identity, snapshots, command results, and foreground-lease messages. Terminal bytes and reconstructed display state are forbidden.
- `storage`: SQLite migrations, old-generation reconciliation, and exclusive foreground-lease persistence. Historical schema tables remain readable for installed-state compatibility but do not authorize legacy product behavior.
- `supervisor`: endpoint identity, cohort ownership, foreground leases, and release shutdown coordination. It owns no terminal surface.
- `transparent`: generic command resolution, foreground broker, and native attached launchers.
- release/update/bootstrap: package-derived immutable release identity, cohort selection, durable update transactions, rollback, and dependency-light command entry.

## Dependency direction

Terminal boundaries are application-agnostic. They may not select behavior from executable names, arguments, CLI-specific environment variables, or visible text. Production code may not import private Pi distribution APIs or use a Pi-specific terminal workaround.

The repository has no production PTY or terminal-emulator dependency. Reintroducing `node-pty`, xterm state, custom input encoders, mode/query trackers, cadence-derived frame inference, or renderer/projection code requires an approved capability change and cannot enter transparent mode.

`scripts/check-architecture.mjs` enforces the structural parts of these boundaries. Cross-cutting rationale belongs here; implementation history belongs in Git and archived OpenSpec changes.
