# Proposal

## Why

Since the single-agent pivot (#878), `bin/ui.js` no longer passes a process inspector to `composeOwnedUi()`, and composition forwards the absent option straight to `SessionRuntimeRegistry`. The registry treats a missing inspector as an SDK seam that cannot claim, so `readerFor()` returns `null` before recording the identity or arming its retry timer. Every bare A1 session therefore runs unregistered, and `a1 session link-worktree` / `a1 session worktrees` report `session-runtime-unavailable` indefinitely; waiting or restarting cannot recover.

## What Changes

- Make bare-A1 composition supply the supported production process inspector (`inspectLiveProcess`) when the caller omits `inspectProcess`, matching the default the CLI session-context handler and lifecycle context already use.
- Preserve an explicitly injected inspector for tests and SDK callers.
- Keep the comparison (`a1 pi`) profile unregistered through its existing `runtimeId: undefined` boundary; it acquires no inspector-driven claims.
- Leave `SessionRuntimeRegistry`'s explicit dependency checks, ownership verification, PID-liveness identity, and legacy-record handling unchanged.
- Add composition-level regression coverage that calls `composeOwnedUi()` the way `bin/ui.js` does, without an inspector override, so the shipped path is tested rather than only registry tests with injected dependencies.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-worktree-recovery`: Require production composition of bare A1 to supply a working process inspector by default, so runtime registration and its retries are never silently disabled on the normal launch path.

## Impact

- Production owner: `src/composition/owned-ui.ts` (one default at the composition boundary). `bin/ui.js` keeps its current call shape.
- Tests: `test/composition/` composition-wiring coverage using the existing engine-host seam and isolated `A1_DATA_DIR`-style product-path overrides; existing `test/composition/session-runtime-registry.test.ts` retains retry/switch/disposal coverage, extended only where the default path needs it.
- No new dependencies, settings, persistence formats, diagnostics wording, lock layout, or recovery procedure changes. `docs/worktree-link-recovery.md` needs no change: the failure is missing wiring, not damaged state.
- Release publication and installation of a fixed build remain separate maintainer decisions.

## Delivery

This draft contains planning artifacts only. Implementation requires explicit maintainer plan approval and an implementation request, and will continue in the same branch, worktree, and pull request.
