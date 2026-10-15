## Context

Resident tabs render a one-row attach-owned strip above a child terminal surface. Crossterm reports zero-based outer-terminal mouse rows. The attach event loop already separates row zero for strip interaction, but the surface path subtracts one row before calling an encoder whose coordinate helper subtracts the strip row again. The child therefore receives `outer row - 2` instead of `outer row - 1`.

Direct single-agent A1 has no strip and receives coordinates aligned with its rendered viewport, which explains why pinned-prompt and jump-to-bottom hover work there but appear displaced under tabs.

## Goals / Non-Goals

**Goals:**
- Remove the resident-only one-row pointer displacement for every forwarded mouse event kind.
- Keep row-zero tab-strip interaction local to the attach client.
- Lock the outer-to-child coordinate contract with focused native tests.

**Non-Goals:**
- Change custom-viewport hit regions, styling, or hover composition.
- Change tab-strip height, rendering, or actions.
- Change keyboard, paste, focus, resize, or direct-launch input routing.

## Decisions

### 1. Keep coordinate conversion in one helper

The attach event loop will pass the original crossterm outer row to the mouse encoder. The encoder will remain the sole owner of converting an outer row to the child row through `child_mouse_row`. Row zero will continue to be handled and consumed before encoding.

Moving all subtraction to the event loop was rejected because it would make the encoder's `outer_row` contract misleading and retain two places that can drift.

### 2. Preserve one-based SGR mouse encoding after conversion

The helper accepts zero-based outer coordinates, removes the one-row strip, and the encoder then adds one for the SGR protocol. Thus outer row one becomes child SGR row one, and every later surface row remains aligned. Column conversion is unchanged because the strip adds no horizontal inset.

### 3. Test the complete encoded boundary

Native unit coverage will assert that the first child row and a later child row encode to their corresponding one-based SGR rows for representative motion and activation reports. It will also retain the explicit contract that outer row zero has no child coordinate, ensuring strip interaction cannot leak into A1.

## Risks / Trade-offs

- **[An input path still pre-translates rows]** → Keep exactly one call site for mouse encoding and assert encoded first/later surface rows.
- **[Strip clicks leak into the child]** → Preserve the event-loop row-zero branch and the helper's `None` result for outer row zero.
- **[Only hover is repaired]** → Exercise more than one mouse event kind; all supported kinds share the same encoder and coordinate conversion.

## Migration Plan

No data or configuration migration is required. The repair takes effect when the updated native terminal host is built and used. Rollback restores the resident-only pointer offset and is safe only as a temporary operational fallback.
