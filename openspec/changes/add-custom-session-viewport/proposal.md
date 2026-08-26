## Why

Bare A1 still presents the transcript as Pi's flowing document, so long sessions can move the editor and status out of a reader's stable working area and offer no A1-owned way to understand or control transcript position. The custom viewport is the next single-agent customization milestone: it gives the transcript a bounded scroll surface while preserving the accepted engine workflows and the existing prompt/status components.

## What Changes

- Give bare `a1` an A1-owned session viewport whose transcript occupies the rows above a bottom dock; the existing working status, input surface, widgets, and footer remain in that dock and keep their current rendering.
- Keep transcript output followed at the end until the reader scrolls away; while detached, new streamed output does not move the view, and submitting a prompt or using the visible scroll-to-bottom control restores end following.
- Add one A1 scrollbar rail with configurable appearance (`always`, `hover`, or `hidden`) and style (`thin` or `thick`). Hover appearance responds to pointer proximity, recent scrolling, and dragging. No scroll-speed setting is introduced.
- Render submitted user prompts with a right-aligned timestamp when width permits. When a prompt governs the top of a scrolled view, its first row remains pinned with the same timestamp; it stays prominent while its continuation rows remain visible, becomes quiet after the complete prompt leaves view, and returns to the prompt when activated.
- Preserve ordinary transcript selection and every existing command, selector, dialog, editor replacement, extension widget, working indicator, and footer contribution. This milestone changes placement and transcript navigation, not status-bar content or input-prompt styling.
- Enable the custom viewport only for bare A1. `a1 pi` continue to present the pinned comparison interface without A1's viewport customization.

**BREAKING**: none. Bare A1 deliberately gains an accepted A1-specific layout while the explicit comparison profiles retain the pinned presentation.

## Capabilities

### New Capabilities

- `custom-session-viewport`: the bounded transcript, bottom dock, follow/detach behavior, scroll-to-bottom control, timestamped sticky prompts, profile scope, resize behavior, and preservation of existing shell surfaces.

### Modified Capabilities

- `ui-components`: the shared scrollbar gains declared appearance and style policies plus activity, hover, and drag presentation states used by the viewport without duplicating rail geometry.
- `owned-ui-settings`: the two live A1 scrollbar settings are declared, resolved, persisted, and applied consistently to the running viewport; scroll speed remains outside this milestone.
- `owned-pi-ui-foundation`: the accepted pinned shell becomes the behavioral foundation under a declared bare-A1 layout customization, while comparison profiles and all non-layout workflows remain unchanged.

## Impact

The change affects the owned session-shell composition, the neutral UI component layer, A1 settings declarations and live propagation, the Pi TUI runtime adapter's pre-routing of viewport input, user-message presentation, profile-aware composition, provenance documentation, and focused component/runtime/shell tests. It adds no dependency, PTY, terminal parser, status-bar redesign, scroll-speed policy, multi-agent behavior, or native-host work.
