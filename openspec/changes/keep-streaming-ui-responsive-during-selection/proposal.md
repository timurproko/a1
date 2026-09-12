## Why

Selecting transcript text or scrolling with the mouse wheel while the agent generates a large collapsed tool block can noticeably slow bare A1's UI, including its working spinner. Existing selection-row caches and stream throttling do not bound the combined cost of pointer handling, synchronous tool-renderer preparation, viewport composition, and terminal painting, so selection and scrolling need explicit joint responsiveness guarantees and regression workloads.

## What Changes

- Make unchanged pointer reports paint-free and coalesce superseded interaction presentations while preserving every input action's semantics, pointer ownership, and edge-auto-scroll behavior.
- Make wheel scrolling an explicit performance target: preserve every report's configured distance, direction, clamping, and follow transition while presenting only the newest eligible viewport position; remove unconditional forced repaint from ordinary wheel input and repair only proven damage.
- Reuse stable document layout and overlapping visible base rows for selection, wheel scrolling, hover, editor, and status-only frames; keep content, interaction, geometry, and theme invalidation distinct.
- Keep semantic agent state current while bounding built-in tool presentation preparation by eligible frames, removing redundant setters and unchanged-content highlighting, and keeping expensive hidden-content preparation out of latency-sensitive interaction work.
- Track actual presentation progress rather than treating input receipt as a completed frame, so continuous input cannot starve content, completion, or visible spinner updates.
- Permit bounded movement with a held or retained selection only when owned semantic metadata and terminal replay prove selection-safe row movement; preserve the conservative fallback otherwise. Do not pause the agent, freeze output, clear selection, or change follow/detach behavior to conceal lag.
- Extend existing independent input/rendering evidence with collapsed 258-line and larger `write` blocks, sustained selection, wheel scrolling and typing, animation ticks, retained selections, completion, and long-session controls. Cover wheel-only interaction, rapid direction reversal, every scrollbar speed, detached reading during output, and return to the live tail.
- Preserve exact tool-preview text, line counts, syntax colors, expansion, copy semantics, and the unchanged `a1 pi` comparison path. Coordinate hyperlink-cleanup behavior with `eliminate-code-block-streaming-flicker` rather than duplicate or weaken that change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Joint selection and wheel-scrolling responsiveness during streaming, no-op pointer behavior, reuse of stable viewport work, and proof-based selected/followed/detached movement without changing interaction semantics.
- `owned-pi-ui-foundation`: Bounded tool-presentation preparation, fair input/content/animation scheduling, scoped invalidation, and integrated performance/correctness evidence.

## Impact

Implementation will primarily affect the owned session shell/root, viewport controller, stream/input presentation coordination, transcript presenter facade, neutral transcript viewport, and damage-aware terminal boundary. Regression work will extend existing input-responsiveness and terminal-paint producer/replay support rather than introduce a second rendering authority.

The observed `248 more lines, 258 total` hint identifies the pinned built-in `write` preview. Read-only probes found three or four call-renderer invocations per A1 tool update, repeated full highlighting of unchanged completed content, unconditional motion render requests, and a retained-selection veto on optimized followed shifts. The wheel handler additionally requests a forced repaint per report, resetting the pinned differential reference even where the terminal adapter can suppress a redundant clear. These establish mechanisms, not an end-to-end physical-terminal diagnosis; implementation must capture the combined selection and scrolling workloads before remediation.

No persisted data, CLI, engine execution, or provider protocol migration is intended. Installed Pi packages, private renderer state, and comparison producers remain untouched. Any new owned built-in presentation helper must use public boundaries and explicit pinned conformance; opaque extension renderers retain their established callback/lifecycle behavior. This change contains planning artifacts only, not implementation or generated performance evidence.
