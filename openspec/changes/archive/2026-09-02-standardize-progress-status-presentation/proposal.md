## Why

Bare A1 currently renders spinner-backed progress text with inconsistent punctuation: ordinary work uses three ASCII periods (`Working...`) while compaction and retry state can use the single Unicode ellipsis (`Compacting…`, `Retrying…`). The punctuation policy is embedded in individual producers, so every new progress state can repeat the inconsistency instead of inheriting one component-owned design.

## What Changes

- Add one A1-owned progress-status presentation contract for every status rendered with an animated spinner.
- Canonicalize the progress marker to exactly three ASCII periods (`...`), converting a trailing Unicode ellipsis and avoiding duplicated periods when a producer already supplies either form.
- Apply the component policy to built-in work, retry, and compaction states and to extension-provided working messages that use the shared spinner-backed status surface.
- Move punctuation ownership out of individual lifecycle/event producers; producers supply semantic status text while the component supplies the canonical progress marker.
- Preserve spinner frames and cadence, status wording, colors, layout, replacement and lifecycle behavior, cancellation hints, extension ownership, and terminal restoration.
- Leave plain non-progress notices, diagnostics, status lines without a spinner, `a1 pi`, and vanilla Pi unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Define reusable spinner-backed progress-message normalization and rendering behavior.
- `owned-pi-ui-foundation`: Require all bare-A1 built-in and extension working indicators to use the shared canonical three-period progress presentation.

## Impact

The implementation will affect the A1-owned status component and its Pi session-shell adapter, semantic work-state messages from the engine adapter, extension working-message presentation, and focused component/session/engine evidence. It will not modify installed or source-synchronized Pi components, Pi dependencies, the regular `a1 pi` route, or vanilla Pi.
