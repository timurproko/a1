## Why

Bare A1's spinner-backed statuses use the visually heavy three-character marker in text such as `Working...`, while the muted static label does not feel integrated with the cyan spinner. A single Unicode ellipsis and a restrained cyan text animation will make active work feel coherent without making the prompt area distracting.

## What Changes

- Canonicalize every bare-A1 spinner-backed progress label to one terminal Unicode ellipsis (`…`), including built-in working, retry, compaction, measured-progress, and extension-provided working messages.
- Give the semantic status label a subtle animated cyan treatment coordinated with the existing spinner cadence, while keeping the ellipsis stable and the label readable.
- Keep animation updates geometry-stable and bounded: no text movement, punctuation cycling, extra timers, or increased frame cadence beyond the existing spinner.
- Preserve status wording, spinner glyphs, placement, lifecycle, cancellation, extension ownership, and terminal cleanup.
- Leave non-spinner notices and diagnostics, copied transcript content, `a1 pi`, and vanilla Pi unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Change the shared spinner-backed progress marker to a Unicode ellipsis and define a restrained, geometry-stable animated text treatment.
- `owned-pi-ui-foundation`: Apply the shared punctuation and animation presentation to all bare-A1 built-in and extension working indicators without changing comparison-mode Pi.

## Impact

The implementation will affect the A1-owned progress-status presentation utility, bare-A1 status composition and theme styling, focused status/session rendering fixtures, and presentation-boundary governance evidence. It will not change semantic engine messages, extension APIs, persisted data, protocols, dependencies, installed Pi code, or source-synchronized comparison components.
