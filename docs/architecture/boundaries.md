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
- `workspace-contracts`: dependency-free multi-agent identity, capability, command/event/snapshot, terminal window/tab/pane/session topology, native-host, and recovery contracts.
- `structured-agent-runtime`: planned typed event/command/snapshot runtime. It must not infer semantics from terminal text, own pseudoterminals, or reconstruct screens.
- `native-host-protocol`: planned typed local boundary for native-host identity, topology revisions, lifecycle, and recovery. Terminal bytes, per-event child input, and rendered cells are forbidden across it.
- `protocol`: additive control handshake, bounded line framing, request identity, snapshots, command results, and foreground-lease messages. Terminal bytes and reconstructed display state are forbidden.
- `storage`: SQLite migrations, old-generation reconciliation, and exclusive foreground-lease persistence. Historical schema tables remain readable for installed-state compatibility but do not authorize legacy product behavior.
- `supervisor`: endpoint identity, cohort ownership, foreground leases, and release shutdown coordination. It owns no terminal surface.
- `transparent`: generic command resolution, foreground broker, and native attached launchers.
- release/update/bootstrap: package-derived immutable release identity, cohort selection, durable update transactions, rollback, and dependency-light command entry.

## Dependency direction

Terminal boundaries are application-agnostic. They may not select behavior from executable names, arguments, CLI-specific environment variables, or visible text. Production code may not import private Pi distribution APIs or use a Pi-specific terminal workaround.

The repository has no production PTY or terminal-emulator dependency. Reintroducing `node-pty`, xterm state, custom input encoders, mode/query trackers, cadence-derived frame inference, or renderer/projection code requires an approved capability change and cannot enter transparent mode.

`scripts/check-architecture.mjs` enforces the structural parts of these boundaries. Cross-cutting rationale belongs here; implementation history belongs in Git and archived OpenSpec changes.

## Planned multi-agent boundaries

The workspace feature may depend on workspace contracts and the structured/native-host foundations. Those foundations may depend only on dependency-free workspace contracts, never on product features, launch profiles, or each other unless an approved capability adds the dependency. Explicit launch profiles and transparent fallback may not import, initialize, launch, or connect to composed native-host infrastructure.

The structured-agent runtime must use typed events, commands, snapshots, cancellation, and recovery evidence. It must not infer structured semantics from terminal text, terminal timing, or visual content and must not own pseudoterminals or renderer state.

The native-host protocol boundary may carry only bounded typed control and semantic lifecycle messages. Pseudoterminal bytes, per-event child input, rendered cells, cell grids, framebuffers, and screen buffers are forbidden across it. Native host executables and packaging live outside the current JavaScript production owners and remain unavailable until the isolated Windows 2×2 proof passes; replacing them with a lightweight custom parser/renderer is forbidden.
