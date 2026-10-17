# Proposal

## Why

Bare A1 visually selects text in the ordinary prompt and footer/status bar, but those surfaces do not follow the same copy-on-select behavior as transcript content. Users should get one predictable clipboard interaction across selectable session text: release copies when `Copy on select` is enabled, while `Ctrl+C` copies the retained selection when it is disabled.

## What Changes

- Automatically copy pointer-selected text from the ordinary bare-A1 prompt input and footer/status bar when fullscreen `Copy on select` is enabled, including prompt word/line multi-click selection and frame drags.
- Make retained prompt-frame and status selections eligible for explicit `Ctrl+C` copying when automatic copying is disabled; keep the established `Ctrl+C` route for editor-owned prompt selections.
- Preserve exact selected prompt text, selected frame columns, and visible row order for prompt-only, status-only, and mixed selections while continuing to exclude prompt chrome, cursor markers, autocomplete, widgets, notices, transient progress, alignment rows, and other non-copyable chrome.
- Keep keyboard-selected prompt copy/cut, transcript semantics, acknowledgement behavior, bounded clipboard delivery, `a1 pi`, and regular terminal-owned selection unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Apply copy-on-select and explicit copy consistently to pointer-selected ordinary prompt input and footer/status-bar text.

## Impact

The change affects bare-A1 dock-row copy metadata, frame-selection extraction policy, shell/controller composition, and focused viewport and session-shell selection tests. It adds no setting, dependency, persisted state, or installed Pi modification.
