## Context

See `proposal.md` for the reported behavior. A1 enables SGR mouse reporting for owned screens. In SGR encoding, codes 64 and 65 represent vertical wheel up/down, while 66 and 67 represent horizontal wheel left/right. The shared decoder currently treats every code with bit 64 set as vertical and uses only the low bit for direction, mapping 66 to up and 67 to down.

The decoder feeds multiple owned surfaces, so the correction belongs at the shared input boundary rather than in each scrollable screen. Keyboard bytes can share an input chunk with pointer reports and must remain intact.

## Goals / Non-Goals

**Goals:**
- Admit only codes 64 and 65 into the existing vertical wheel event model.
- Safely consume recognized horizontal SGR wheel reports so they cannot affect scrolling or focused input.
- Prove mixed-report behavior at the decoder and transcript-routing boundaries.

**Non-Goals:**
- Add horizontal scrolling or new public pointer event kinds.
- Smooth, accelerate, debounce, or otherwise reinterpret vertical wheel input.
- Change scrollbar speed, touchpad settings, terminal configuration, or pinned Pi behavior.

## Decisions

### 1. Filter horizontal wheel reports in the shared SGR decoder

The decoder will return no pane event for recognized horizontal codes 66 and 67. Both parser entry points already distinguish a matched SGR report from an emitted event, allowing the report to be consumed without expanding the pane event contract.

Alternative: represent wheel-left and wheel-right in `PaneMouseEvent`. Rejected because no owned surface supports horizontal scrolling and forwarding new event kinds would broaden every consumer for no user benefit in this fix.

### 2. Keep exact vertical wheel semantics

Codes 64 and 65 will continue to emit one up/down event per report with unchanged coordinates. No coalescing or timing heuristic will be introduced, so configured line distance and event ordering remain authoritative.

Alternative: suppress rapid direction changes. Rejected because that could hide genuine vertical reversals and would depend on device timing rather than correcting the axis decoding error.

### 3. Test mixed chunks and viewport outcomes

Component tests will cover all four wheel codes and mixed keyboard/report chunks. Session viewport tests will route touchpad-style sequences and assert that only vertical reports change scroll position and follow state.

Alternative: parser-only tests. Rejected because they would not prove that ignored horizontal reports are consumed rather than leaked to focused input or viewport routing.

## Risks / Trade-offs

- **[A terminal uses nonstandard wheel codes]** → Follow the SGR encoding contract and retain malformed/unsupported-report safety; do not infer vertical intent from horizontal codes.
- **[Users expected horizontal gestures to scroll vertically]** → Prefer axis-correct behavior; A1 has no declared horizontal-to-vertical fallback and the current mapping can reverse vertical movement.
- **[Filtering removes a future horizontal-scroll signal]** → A future horizontal scrolling feature can deliberately extend the event contract and consumers with its own specification.

## Migration Plan

Ship the decoder and tests together; no stored state or settings migration is needed. Rollback restores the prior decoder but also restores the direction-reversal defect.

## Implementation Evidence

- Focused component and session viewport validation passed on implementation head preparation: 2 files and 77 tests.
- Typechecking passed after generated build output was available.
- The complete local build reached the native process-guardian link step but could not finish because the active shell resolved the Unix `link` utility instead of Visual Studio's linker; Node 26.1.0 was also outside the declared Node 22.19–24 engine range. This environment limitation does not replace exact-candidate CI or physical touchpad validation.
