# Proposal

## Why

Resident multi-agent A1 inserts a native terminal boundary between the user's terminal and the complete owned A1 UI, but current certification mostly proves individual encoders and terminal components rather than parity across that complete boundary. Basic solo interactions—including content selection, copy and paste, prompt shortcuts, immediate rendering, concurrent streaming, and double-`Ctrl+C` exit—can therefore regress even though isolated probes pass.

## What Changes

- Make `a1 solo` the behavioral oracle for every viewed resident child interaction: prompt editing, effective shortcuts, completion, clipboard, selection, mouse, dialogs, extension text UI, focus, resize, terminal modes, and feedback.
- Define the resident-only differences narrowly: the tab strip and assigned tab actions, detach-instead-of-terminate exit behavior, non-duplicated session name, process residency, and the existing text fallback for unsupported inline-image protocols.
- Add a differential end-to-end harness that drives equivalent interactions through direct solo and resident paths and compares semantic outcomes rather than certifying only isolated native helpers.
- Repair clipboard-control forwarding, first-use paste, selection/copy ownership, modified-key preservation, controller handoff, and actual terminal-event recognition wherever the differential audit finds resident divergence.
- Keep every tab's child renderer and terminal model advancing independently while several agents stream, and present the current partial surface immediately whenever a tab becomes viewed.
- Commit tab topology, active selection, child surface, overlays, cursor, and terminal modes coherently so create, close, switch, status, resize, and recovery do not flash, expose stale content, or delay input.
- Add bounded multi-tab stress coverage for simultaneous streaming, rapid switching, lifecycle work, paste, selection, resize, and slow-client pressure on Windows, macOS, and Linux validation lanes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: establish direct solo behavior as the resident child interaction contract, narrow the intentional tab-specific differences, and require exact detach, concurrent-streaming, shortcut, selection, and clipboard behavior.
- `resident-terminal-host`: require complete-boundary input/output fidelity, coherent presentation transactions, clipboard-control transport, independent per-tab progress, and differential exact-artifact evidence.

## Impact

- **Native terminal host:** attach input decoding, terminal-mode negotiation, child control forwarding, server/holder surface scheduling, presentation composition, and native role fixtures under `native/terminal-host/`.
- **Owned A1 integration:** resident launch/composition seams and focused shell/clipboard/input observability where the native boundary needs a semantic oracle; direct `a1 solo` behavior remains the baseline rather than a target for redesign.
- **Validation:** focused TypeScript and Rust parity fixtures plus per-platform exact-package terminal-host validation. Existing isolated fidelity probes remain useful but no longer suffice for interaction parity.
- **Related delivery:** draft PR #791 owns an overlapping atomic strip-presentation plan. Implementation will reconcile its delivered behavior from `develop`, or require explicit consolidation if it remains open, rather than editing its busy worktree or creating two competing presentation implementations.
- No stored session, registry, settings, or public command migration is intended; protocol additions, if required for terminal controls or presentation metadata, remain additive within the existing generation.
