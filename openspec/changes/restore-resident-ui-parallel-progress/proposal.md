## Why

Resident multiagent A1 feels markedly less responsive than direct `a1 solo`, and the maintainer reports that only the first responding Agent advances while other working tabs remain stuck even when selected. Independent parallel progress and solo-like interaction behavior are equal highest-priority functional outcomes: responsive input, flicker-free coherent presentation, current partial content, and live animations are not cosmetic polish. Neither concurrency nor interaction fidelity is sufficient without the other, and neither can be claimed from independent processes, final snapshots, or small counter fixtures alone.

## What Changes

- Restore independent progress for at least three simultaneously working real A1 children, including hidden children, with separate engine, child-render, PTY, retained-surface, and outer-presentation observations so execution stalls are distinguished from stale presentation.
- Keep hidden child render scheduling and animation phase advancing; suppress only unnecessary surface delivery, never agent execution, terminal parsing, or the ability to acquire the newest complete screen on selection.
- Make child synchronized-update boundaries authoritative for publication, with bounded malformed-transaction recovery and one final outer synchronization envelope containing content, overlays, modes, and cursor.
- Separate complete retained surfaces from live terminal damage: unchanged rows do not repaint, ordinary edits do not force full-screen output, and slow viewers receive newest coherent state rather than a backlog.
- Bound hot-path work and queues, keep input and switching fair under concurrent output, and keep expensive surface serialization outside shared server-state critical sections.
- Commit activation and resize only against the correct tab/incarnation/geometry, preserving coherent content until the replacement is ready and retaining first-input ownership guarantees.
- Preserve certified text-terminal styles and hyperlink targets through reconstruction, with explicit unsupported-image fallback unchanged.
- Extend exact-artifact comparison to real owned A1 rendering, concurrent streamed responses, animations, fragmented writes, resize, overlays, and adverse output pressure; do not treat encoder or token-presence probes as visual certification.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: strengthen independent concurrent progress with hidden animation continuity, first-responder fairness, and immediate live continuation after activation.
- `resident-terminal-host`: distinguish complete retained state from incremental presentation, enforce transaction integrity and bounded scheduling, and require causal real-A1 concurrency and visual evidence.

## Impact

- Native holder parsing/publication, server surface routing and shared-state locking, attach input/render scheduling, view geometry, and terminal attribute serialization under `native/terminal-host/`.
- Owned-shell/engine integration only where a diagnosed progress dependency or bounded test observation requires it; solo remains the behavioral oracle and is not routed through the resident compositor.
- Focused Rust and TypeScript tests, deterministic provider fixtures, exact-artifact presentation/latency harnesses, and their existing platform validation callers.
- Retain process isolation, session-writer ownership, prompt recovery, controller barriers, privacy, and explicit-close residency. No new public setting, arbitrary CLI support, split layout, or dual screen authority.
- PRs #794 (native addon hosting) and #795 (session/native role decomposition) overlap relevant paths. Reconcile their integrated baseline in this same branch before implementation where applicable; never edit their worktrees or undo their ownership boundaries.

## Approval boundary

The maintainer generally approved the proposed fidelity/responsiveness direction and clarified that parallel content generation and animation continuity have the same highest priority as visual behavior, responsive input, flicker prevention, and native-feeling interaction. Task order expresses implementation dependencies, not permission to defer either outcome as polish. This delivery starts with planning artifacts only; an explicit implementation request is still required before code or test changes. The reported live stall has not yet been reproduced or attributed to one layer.
