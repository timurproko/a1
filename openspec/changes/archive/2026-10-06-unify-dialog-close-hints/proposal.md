## Why

Bare A1 dialogs advertise the same Escape dismissal with inconsistent wording—or omit it entirely—so Settings says `Esc to cancel`, operation progress says `escape cancel`, and Session Tree and Resume Session show no close control while Models already establishes the concise `Esc close` pattern. The dialog family should present one predictable close hint everywhere.

## What Changes

- Standardize A1-rendered dialog dismissal guidance on the exact semantic entry `Esc close`, positioned last in the active shortcut guidance.
- Add the missing close entry to dialog states such as Session Tree and Resume Session, and replace `Escape cancel`, `Esc to cancel`, `Esc exit`, and lowercase operation variants across top-level, nested, authentication, extension-hosted, startup, and full-screen owned surfaces.
- Keep the close entry visible whenever the available width can contain it, while preserving each surface's established wrapping or clipping policy for the remaining guidance.
- Preserve all Escape handling, operation abortion, nested-parent restoration, focus, disposal, implicit aliases, and `a1 pi` comparison behavior; this change unifies presentation, not interaction semantics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Require every A1-rendered dismissible dialog surface to expose one canonical `Esc close` hint without changing its dismissal behavior.

## Impact

Affected areas include the shared semantic shortcut contract, owned Settings and reference routes, local/adapted Pi dialog components and selector adapters, the startup-safe trust prompt, operation progress presentation, modal inventory coverage, and focused dialog rendering/workflow tests. No persisted data, external API, or dependency changes are expected.
