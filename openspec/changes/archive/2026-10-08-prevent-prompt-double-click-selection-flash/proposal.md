## Why

A no-drag pointer press in the bare-A1 prompt is provisionally handled as complete-frame selection until release, so a prompt multi-click can briefly paint selection across the padded row before the editor replaces it with its text-bounded selection. This full-width flash is inconsistent with selecting agent content and makes ordinary prompt selection look unstable.

## What Changes

- Keep pending no-drag prompt clicks visually owned by the editor instead of painting a provisional complete-frame selection.
- Make prompt double-click and triple-click selection remain bounded to the editor's semantic word or logical-line text without an intermediate full-width highlight.
- Promote a prompt-originated gesture to complete-frame selection only after distinct pointer movement, preserving cross-prompt dragging and existing selection ownership.
- Add focused presentation-order and interaction coverage while retaining transcript selection, editor copy, controls, modal ownership, and comparison-profile behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Require no-drag prompt multi-clicks to avoid provisional frame-selection paint while preserving editor selection and drag promotion.

## Impact

- Affects bare-A1 pointer routing in the session viewport controller and focused session-shell selection tests.
- Does not change editor text semantics, clipboard transport, transcript word/line selection, terminal-owned regular-mode selection, `a1 pi`, dependencies, or installed Pi code.
