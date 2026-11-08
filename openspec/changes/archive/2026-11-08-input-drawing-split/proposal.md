# Proposal

## Why

The four largest input and drawing units each carry several concerns in one body:

- **`SessionViewportController.handlePreInput` is 316 lines.**
  - About 80 lines route keyboard shortcuts (paste, Ctrl+Home/End, prompt jumps, copy).
  - The other 230 lines are one pointer closure that handles motion, wheel, press and release for the rail, sticky header, jump-to-bottom control, tail control, editor and transcript selection.
  - The gesture latches it uses (pointer owner, dock and tail suppression, pending editor click, rail drag, pointer position, hovered link) are 8 of the controller's 29 fields.
- **`TranscriptViewport.compose` is 348 lines.**
  - It aligns the live tail, clamps scroll, lays out the scrollbar, anchors selection, places the jump-to-bottom control and covered cells, paints every row through four caches, and builds the frame descriptor and hit regions.
  - The four row caches and the painter ids they key on are 6 of the class's 34 fields.
- **`PromptSelectionInterceptor` has 41 methods, and `handleInput` is 109 lines.**
  - Bracketed-paste framing (start marker, split end marker, size cap) is interleaved with paste insertion.
  - A second copy of the framing state lives in a module `WeakMap` for the paste-disabled path.
- **`SettingsApp` has 33 methods.** The model and thinking-level dialog (key handling, filtering, level options and its 68-line renderer) is about 200 lines inside the settings screen.

## What Changes

- **Viewport pointer gestures.**
  - A `ViewportPointerGestures` collaborator (`viewport-pointer.ts`) owns the gesture latches and handles motion, wheel, press and release.
  - `handlePreInput` keeps the keyboard shortcuts and hands mouse reports to it.
- **Frame composition.**
  - `compose` becomes a sequence of named phases: tail layout, scrollbar, selection anchors, floating control, row painting, descriptor and hit regions.
  - The phases that need no viewport state are module functions in `transcript-viewport-frame.ts`.
  - The four row caches and the painter ids move into a `ViewportRowCaches` class there.
- **Editor paste framing.**
  - A `BracketedPasteFramer` assembles bracketed paste across input chunks, enforces the size cap and reports the text, the bytes and any input before or after the paste.
  - The interceptor and the paste-disabled path both use it, so the module `WeakMap` goes.
  - `handleInput` drops under the long-function threshold.
- **Settings model dialog.** The model and thinking-level dialog moves to `settings-model-dialog.ts`: its keys, filtering, level options and lines.
- **Unchanged.**
  - Every keystroke, pointer gesture, paste, copy, selection, scroll and rendered frame.
  - The frame descriptor, damage rows and cache reuse.
  - The public methods of the four classes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `owned-ux-architecture`: input and drawing units keep one concern each, with pointer gestures, frame phases, paste framing and the model dialog in named collaborators.

## Impact

- `src/app/session-shell/session-viewport-controller.ts`, new `viewport-pointer.ts`.
- `src/ui/components/transcript-viewport.ts`, new `transcript-viewport-frame.ts`, and new `transcript-viewport-types.ts`, which holds the viewport's public types so the frame module can use them without an import cycle.
- `src/integrations/pi/components/owned-editor-ux.ts`, new `bracketed-paste.ts`.
- `src/features/owned-ui/settings-app.ts`, new `settings-model-dialog.ts`.
- The size ratchet drops `handlePreInput`, `compose` and `handleInput` from the long-function list and lowers the `SessionViewportController`, `TranscriptViewport` and `SettingsApp` entries. `PromptSelectionInterceptor` stays at its recorded size, because the word-left handler replaces the helper it absorbs.
- The startup graph gains three files and about 10 KB of source; the types module is type-only and adds nothing at runtime.
