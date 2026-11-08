# Tasks

## 1. Viewport pointer gestures

- [x] 1.1 Move the gesture latches and the motion, wheel, press and release handling into `ViewportPointerGestures` (`viewport-pointer.ts`); `handlePreInput` keeps the keyboard shortcuts and combines per-report outcomes.

## 2. Frame composition

- [x] 2.1 Split `TranscriptViewport.compose` into named phases, with tail layout, the floating control, the descriptor and the hit regions as module functions and the four row caches in `ViewportRowCaches` (`transcript-viewport-frame.ts`).

## 3. Editor paste framing

- [x] 3.1 Move bracketed-paste assembly into `BracketedPasteFramer` (`bracketed-paste.ts`), use it from the interceptor and the paste-disabled path, delete the module `WeakMap`, and bring `handleInput` under the long-function threshold.

## 4. Settings model dialog

- [ ] 4.1 Move the model and thinking-level dialog's keys, filtering, level options and lines into `settings-model-dialog.ts`.

## 5. Baselines

- [ ] 5.1 Lower the size ratchet entries and re-pin the startup graph.
