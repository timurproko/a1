# Proposal

## Why

Resident tab auto-naming starts only after the first turn settles and uses an output budget too small for reasoning models, so long-running agents can remain generically named for their entire visible run. The native title transition also approximates rather than reproduces v2's animated rename.

## What Changes

- Start one best-effort auto-name request when the first agent run begins instead of waiting for that run to settle.
- Use bounded, escalating generation budgets that allow reasoning models to return a short title, while retaining deterministic fallback and keeping naming independent of the active turn.
- Recheck name ownership before applying a generated result so a concurrent manual rename always wins in both the tab registry and Pi session.
- Restore v2's complete automatic-title transition, including the moving per-character rainbow, typewriter reveal, settle-to-gray phase, stable endpoint width, and plain non-truecolor fallback; manual renames remain immediate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-agent-tabs`: Auto-naming begins during the first run, remains bounded and race-safe, and automatic title changes reproduce the complete v2 transition.

## Impact

- Resident-tab composition and auto-name generation under `src/composition/` and `src/features/resident-tab/`.
- Native strip animation and tab-list reconciliation under `native/terminal-host/src/roles/`.
- Focused TypeScript and Rust tests for trigger timing, reasoning-budget escalation, rename races, and animation frames.
