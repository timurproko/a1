# Proposal

## Why

Resident multi-agent tabs currently discard modifiers from navigation and editing keys before forwarding them to the A1 prompt. As a result, shortcuts such as Ctrl+Left and Ctrl+Right behave like plain arrow keys instead of matching direct solo-agent input.

## What Changes

- Preserve supported Ctrl, Alt, and Shift modifiers when resident tabs forward non-character keyboard input to the child terminal.
- Restore prompt-editor behavior for word navigation and related modified navigation/editing shortcuts without changing tab-owned shortcut interception.
- Add focused native-host regression coverage for the forwarded terminal sequences.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-agent-tabs`: Require resident-tab keyboard forwarding to preserve modified prompt-editor shortcuts with direct solo-agent behavior.

## Impact

The resident terminal host's attach-side keyboard encoder and its focused Rust tests are affected. The child prompt editor, direct solo-agent path, tab shortcut declarations, and external APIs remain unchanged.
