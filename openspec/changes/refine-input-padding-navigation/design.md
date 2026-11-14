## Context

Settings currently declares Shift+Up/Down and decodes their legacy CSI sequences in `src/features/owned-ui/settings-app.ts`. Agent transcript routing in `src/app/session-shell/session-viewport-controller.ts` accepts Shift-only and Ctrl-only arrows; effective bindings also pass through the Pi component adapter. These paths must agree on the requested Ctrl+Shift chord rather than changing only the footer text.

`src/ui/components/prompt-input.ts` owns shared input presentation and geometry. Agent editing and Settings search consume the shared editor/presentation path. Its current zero-padding geometry reserves a cursor column but does not guarantee a left gutter or a stable right gutter across continuation rows. Editor wrapping, selection, pointer mapping, and presentation must use the same content rectangle.

## Decisions

### One navigation chord

Use Ctrl+Shift+Up for previous section/anchor and Ctrl+Shift+Down for next section/anchor. Update semantic shortcut declarations, terminal encodings, routing, and visible help consistently. Shift-only and Ctrl-only arrows must not trigger these jump actions. Preserve chronological prompt/compaction anchor order and the current earliest/newest boundary behavior, draft contents, history recall, and modal/selector ownership.

### Shared full-height input gutters

Establish a minimum one-cell gutter on each side in the shared owned input geometry and renderer. Render the editor body without internal padding into the reduced shared content width, reserving a separate cursor cell; apply configured padding once in shared presentation. Marker-bearing dialog fields retain their existing frame inset policy, and tiny frames reduce unavailable gutters before safely clipping. Render semantic border annotations against the full frame width rather than the reduced body width. Every body row, including placeholders, empty continuation rows, wrapped text, and explicit newlines, uses that same rectangle. Rules remain full width. Avoid adding a second inset to editor rows that already implement effective padding; larger explicitly configured editor padding remains supported. Constrain virtual-width rendering at narrow terminal widths so no row overflows.

Propagate the effective content rectangle to caret placement, wrapping, selection painting, pointer hit testing, and autocomplete anchoring. Gutters remain presentation-only and must not become draft characters or copied/submitted text. Keep the comparison-profile renderer independent and preserve existing prompt-marker policy.

## Delivery outcomes

1. Deliver Ctrl+Shift section/prompt navigation and its focused regression tests.
2. Deliver shared full-height input gutters and their focused regression tests.

`tasks.md` mirrors this outcome order. Implementation will remain in this draft delivery after plan approval and an implementation request.

## Validation approach

Use only changed owner-level tests, TypeScript checks, and strict OpenSpec validation locally. Shortcut cases include legacy and supported enhanced terminal encodings, old-chord non-jumps, navigation boundaries, help text, and focused input ownership. Input cases include empty and multiline drafts, explicit and soft line breaks, narrow widths, wide graphemes, caret/selection geometry, pointer targeting, and unchanged copy/submission payloads. No broad suite or physical terminal automation is required for task completion.

## Known gaps

None. The copied editor adapter changes are gated by injected shared input presentation, preserving the independent `a1 pi` path. Focused outcomes and manual-review limitations are recorded in `implementation-evidence.md`.
