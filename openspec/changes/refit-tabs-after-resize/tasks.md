## 1. Activation geometry

- [x] 1.1 Send the attach terminal's current resize frame immediately after every requested tab view so the newly selected holder receives the active geometry.
- [x] 1.2 Reapply current geometry during startup attachment to an already-running selected tab without broadcasting one client's size to unrelated holders.

## 2. Coherent presentation

- [x] 2.1 Preserve the existing stale-surface barrier until the selected holder publishes a complete current-geometry frame.
- [x] 2.2 Add focused native regression coverage for resize-then-switch and resized reattachment ordering and presentation.

## 3. Background fitting refinement

- [x] 3.1 Forward an authoritative outer resize to globally hidden, unclaimed holders without affecting tabs viewed or controlled by another client.
- [x] 3.2 Carry current geometry in each view request and queue target resize before fresh surface subscription, removing the redundant post-selection resize.
- [x] 3.3 Add native regression coverage for hidden-holder pre-fitting, resize-before-subscription activation ordering, and spectator isolation.

## 4. Stable active resize presentation

- [x] 4.1 Replace the complete outer UI with a centered live terminal-dimension curtain for the duration of each resize event burst.
- [x] 4.2 Suppress ordinary paints behind the curtain and restore one forced complete frame after a quiet interval and current-geometry surface, with bounded fallback.
- [x] 4.3 Add focused native coverage for curtain centering, paint suppression, settle gating, and complete restoration.

## 5. Soft resize completion

- [x] 5.1 Extend the post-resize curtain hold and reveal the settled complete UI using terminal faint intensity with the child cursor hidden.
- [x] 5.2 Keep ordinary paints dimmed during the short reveal, then force the current UI at normal intensity; a new resize cancels the reveal.
- [x] 5.3 Add focused native coverage for ANSI and structured dimming, reveal timing, cursor suppression, and final normal repaint.

## 6. Centered status consistency

- [ ] 6.1 Render the resize curtain as a quiet centered `🖥️` mark above `Resize <columns> x <rows>`.
- [ ] 6.2 Remove trailing punctuation from the owned Settings `No settings found` empty state.
- [ ] 6.3 Update focused native and Settings regression coverage for the exact presentation copy and layout.
