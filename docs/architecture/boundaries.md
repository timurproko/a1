# Architecture boundaries

## Terminal and launch-instance ownership

Every interactive command uses this profile-neutral lifecycle path:

```text
mutable a1 entry
  -> verified immutable release
  -> Node launch guardian and authenticated launch-instance registration
  -> native process guardian and per-instance containment
  -> a1-ui runtime selection
  -> owned UI or transparent Pi with inherited physical terminal handles
```

Launch-instance ownership is plural. The supervisor tracks any number of independently authenticated `a1`, `a1 pi`, and `a1 sandbox` instances and never uses one product-wide foreground mutex. Closing one instance closes only its verified process tree. Persisted rows alone do not prove liveness, and uncertainty never authorizes terminating an unrelated process.

Neither guardian reads ordinary terminal input, parses or relays runtime output, renders cells, infers frames, synthesizes terminal responses, or emits display control. Bare `a1` retains its owned UI authority. In explicit Pi profiles, Pi and the physical terminal retain direct terminal behavior. The private guardian boundary carries only bounded identity, readiness, stop, and outcome data.

Transparent mode has no A1-authoritative terminal surface, internal pane, virtual scrollback, inactive resident tab, or visual reconnection. A future feature that requires those properties must introduce and certify a separate composed-terminal authority; it must not weaken or silently intercept transparent mode.

## Current module responsibilities

- `lifecycle`: dependency-free launch-instance, process identity, state transition, outcome, and control-command contracts.
- `process-containment`: artifact verification, OS-verifiable process inspection, containment adapters, and bounded graceful/forced cleanup; it owns no terminal content.
- `launch-guardian`: one profile-neutral instance coordinator above runtime selection.
- `workspace-contracts`: dependency-free multi-agent identity, capability, command/event/snapshot, terminal window/tab/pane/session topology, terminal-host, and recovery contracts.
- `structured-agent-runtime`: planned typed event/command/snapshot runtime. It must not infer semantics from terminal text, own pseudoterminals, or reconstruct screens.
- `native-host-protocol`: bounded typed local boundary for terminal-host identity, topology revisions, lifecycle, and recovery. Terminal bytes, per-event child input, and rendered cells are forbidden across it.
- `protocol`: additive control handshake, bounded line framing, authenticated launch-instance commands, typed stop intent, snapshots, and command results.
- `storage`: SQLite migrations, prior-boot reconciliation, and plural launch-instance persistence. Legacy foreground rows are historical migration input and never authorize current ownership.
- `supervisor`: endpoint identity, plural cohort ownership, per-instance reconciliation, and aggregate release shutdown coordination. It owns no terminal surface.
- `transparent-terminal`: generic command resolution and direct inherited-handle child waiting below the outer launch guardian; it owns no supervisor lease.
- release/update/bootstrap: package-derived immutable release identity, process-guardian integrity, cohort selection, durable update transactions, rollback, and dependency-light command entry.

## Dependency direction

Terminal boundaries are application-agnostic. They may not select behavior from executable names, arguments, CLI-specific environment variables, or visible text. Production code may not import private Pi distribution APIs or use a Pi-specific terminal workaround.

The transparent path has no PTY or terminal-emulator dependency. Reintroducing `node-pty`, xterm state, custom input encoders, mode/query trackers, cadence-derived frame inference, or renderer/projection code requires an approved capability change and cannot enter transparent mode. The Rust process guardian is a lifecycle-only native boundary and is independent from the held composed terminal host.

`scripts/check-architecture.mjs` enforces the structural parts of these boundaries. Cross-cutting rationale belongs here; implementation history belongs in Git and archived OpenSpec changes.

## Planned multi-agent boundaries

The workspace feature may depend on workspace contracts and the structured/terminal-host foundations. Those foundations may depend only on dependency-free workspace contracts, never on product features, launch profiles, or each other unless an approved capability adds the dependency. Explicit launch profiles and transparent fallback may not import, initialize, launch, or connect to composed terminal-host infrastructure.

Default future agents and composed hosts are children of the originating bare-`a1` launch instance and terminate when it closes. A process that survives command closure requires a separately approved explicit resident capability; durable identity or state recovery never implies an implicitly surviving process.

The structured-agent runtime uses a versioned adapter hello and feature negotiation before readiness. Runtime state must use typed events, commands, snapshots, cancellation, and recovery evidence. It must not infer structured semantics from terminal text, terminal timing, or visual content and must not own pseudoterminals or renderer state.

The terminal-host protocol boundary may carry only bounded typed control and semantic lifecycle messages. Pseudoterminal bytes, per-event child input, rendered cells, cell grids, framebuffers, and screen buffers are forbidden across it. Console host executables and packaging live outside the current JavaScript production owners and remain unavailable until the isolated in-terminal proof passes; replacing them with a lightweight custom parser/renderer is forbidden. A desktop-native window and GPU application shell are postponed and are not required for the terminal-hosted product.

Resource queues, retained state, evidence, logs, and diagnostics follow `docs/architecture/resource-and-data-policy.md`. Terminal content and authentication material are never control-store records. Unknown data is potentially sensitive by default and must be rejected or redacted before persistence.

## The rules every surface follows

How A1 builds what a reader sees — deriving a vendor engine's data rather than
transcribing it, failing the build by name when a vendor change has not been
absorbed, keeping vendor knowledge behind the vendor boundary, composing screens
from shared components, showing state rather than narrating it, taking colour
from declared theme roles, and answering both dispatch and description from one
declaration — is stated once in the `owned-ux-architecture` capability rather
than restated per feature.
