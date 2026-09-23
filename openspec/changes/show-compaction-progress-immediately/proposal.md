## Why

Bare A1 can show only `Compacting…` for the preparation and authentication portion of a compaction because its observable progress remains unset until the summary stream is created. Long pre-stream waits therefore look indistinguishable from compactions whose progress cannot be observed, despite the bound session already exposing the stream capability.

## What Changes

- Publish `0%` as soon as an observable compaction enters its active state, before summary preparation or provider streaming begins.
- Preserve streamed text-based progress updates, the below-100 clamp, end-of-compaction cleanup, and the plain fallback when no callable stream function exists.
- Add pinned-AgentSession integration coverage that exercises the real compaction lifecycle through the A1 adapter rather than manually sequencing fake lifecycle events and stream calls.
- Keep the `a1 pi` comparison presentation unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: observable bare-A1 compactions expose their initial zero-percent state immediately when compaction starts.

## Impact

The change affects the compaction progress observer and focused engine integration tests under `src/integrations/pi/engine/` and `test/integrations/pi/engine/`. It does not change compaction thresholds, summary generation, progress estimation after streaming starts, provider dependencies, or comparison-profile rendering.
