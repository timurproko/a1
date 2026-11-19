## Why

Large text pasted into bare A1 through its clipboard integration expands into the prompt instead of remaining compact like native Pi's `[paste #1 +136 lines]` marker. A1 bypasses Pi's large-paste handling on this path, making long pasted material unnecessarily dominate the editor.

## What Changes

- Collapse ordinary pasted text using the pinned Pi thresholds: more than 10 logical lines or more than 1,000 UTF-16 code units after paste normalization.
- Show a compact atomic chip with Pi-style labels: `[paste #N +L lines]` for more than 10 lines, otherwise `[paste #N C chars]` for long text.
- Apply the same behavior to clipboard shortcuts, right-click paste, and terminal bracketed paste, including replacement of selected text and fragmented terminal delivery.
- Preserve the complete normalized payload for submission, copy/cut, queue recovery, undo/redo, and existing history behavior; chip labels must not substitute for the actual prompt sent to the agent.
- Keep short pastes inline, retain existing URL/file/folder/image chip behavior, and leave `a1 pi` unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Specify consistent Pi-style large-text paste chips across the bare-A1 default editor's paste entry points, with atomic editing and lossless payload resolution.

## Impact

Expected implementation areas are `src/integrations/pi/session-ui/prompt-chips.ts`, `src/integrations/pi/components/owned-editor-ux.ts`, their editor/shell integration seams, and focused component/session tests. Existing `persistent-prompt-history` requirements already require reusable expanded text and intact live draft backing; their behavior and retention policy do not change. No new dependency, setting, persisted format, or native-Pi modification is intended. This change contains planning artifacts only.
