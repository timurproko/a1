# Design

## Context

The previous changes split the shell presenter, the shell root and the engine collaborators. The units left above the size thresholds are the ones that turn input into state and state into frames. Each has a single public entry point that is already well covered by frame and input tests, so the split can keep those entry points and move their bodies.

## Decisions

- **Pointer gestures get their own collaborator, and the controller keeps ownership of the viewport.**
  - `ViewportPointerGestures` holds the eight gesture latches and receives the controller's viewport, editor port, config and callbacks through ports.
  - It handles one mouse report and returns a per-report outcome: repaint, forced repaint, activity and a completed copy.
  - The controller combines the outcomes, as the closure does today, and keeps the keyboard shortcuts, follow state, timers and tail control.
  - Existing callers that read the latches (`editorPointerSelecting`, `clearPointerState`) go through the controller's existing methods.
- **Frame phases are pure where they can be.**
  - Tail layout, the floating control, the descriptor and the hit regions depend only on their inputs, so they are module functions.
  - Row painting needs the caches and the painter ids, so `ViewportRowCaches` owns the four caches, their trimming and the cache-entry count, and paints one row.
  - Scroll, follow and selection state stay on `TranscriptViewport`, because the rest of the class reads them.
- **One paste framer for both paths.**
  - `BracketedPasteFramer.feed(data)` returns the input before the paste, the completed paste (text, bytes and whether it exceeded the cap) and the remaining input.
  - The interceptor keeps what to do with a completed paste: insert, transform, defer or reject.
  - The paste-disabled path feeds the same framer and drops the text, which replaces the module `WeakMap` of framing state.
- **The settings model dialog is a module, not a class.**
  - Its state is the existing `StructuredEdit`, which the settings screen already owns.
  - `settings-model-dialog.ts` exports the key handler and the line renderer, and takes the save and close actions as arguments.
- **No method count grows.** A split that would add a private method to a class already above the threshold moves that work into the new collaborator or a module function instead.

## Risks

- **A gesture latch could be read in the wrong order after the move.** Mitigation: the per-report order of checks moves verbatim, and the viewport input, link, paste and selection tests drive full gesture sequences.
- **Frame caching could change.** Mitigation: the cache keys move verbatim, and the rendering-budget and frame-damage tests compare reuse counts.
- **A split end marker could be missed.** Mitigation: the framer keeps the delimiter-sized tail and the surrogate-pair guard, and gets its own chunking test.
