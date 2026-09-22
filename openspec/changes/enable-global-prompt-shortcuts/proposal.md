## Why

Clicking the transcript/content area can leave bare A1's ordinary prompt visibly present but no longer receiving prompt-editing shortcuts. Users should be able to paste, copy, cut, undo, redo, and navigate the draft immediately after interacting with content instead of first clicking inside the prompt.

## What Changes

- Keep the ordinary prompt as the keyboard-editing target when a pointer click, selection, scroll, or viewport-control interaction occurs in the default bare-A1 content area.
- Make every effective ordinary-prompt editing binding available after content interaction, including selection, clipboard, undo/redo, deletion, and cursor/word/line navigation, without duplicating a hardcoded shortcut list outside the editor.
- Preserve input precedence: selected transcript text still owns its copy action, viewport navigation retains its declared shortcuts, and focused modal or replacement inputs keep all of their local keyboard behavior.
- Preserve prompt draft text, selection, caret, undo/redo history, paste reservation behavior, and configurable keybinding resolution while keyboard ownership is retained or restored.
- Add pointer-to-keyboard regression coverage across transcript rows, blank content, scrollbar/navigation controls, prompt selection, transcript selection, custom bindings, overlays, and the pinned comparison profile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Durable ordinary-prompt keyboard ownership after content-area pointer interaction, with existing transcript, viewport, and modal precedence preserved.
- `ui-shortcuts`: Effective prompt-editing declarations remain dispatchable without requiring a prompt click and remain the single source of shortcut resolution.

## Impact

Implementation is expected in the bare-A1 session viewport pre-input/pointer routing and root/editor focus facade, with focused tests around `session-viewport-controller.ts`, `session-shell.ts`, and shell integration fixtures. The editor remains the authority for keybinding matching and edit history; no installed Pi patch, clipboard transport change, persisted-data migration, or `a1 pi` behavior change is intended. Physical testing rejected candidate `c50bf418` because outer runtime focus restoration did not restore the nested ordinary input surface; the refined implementation explicitly restores that surface after content pointer routing.
