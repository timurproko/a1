## Why

Copying a rendered multiline assistant block includes presentation padding and quote borders. Whole-payload trimming removes the initial padding only, so pasted continuation rows gain an offset and renderer decorations can become prompt text.

## What Changes

- Separate renderer-owned left padding and blockquote decoration from selected assistant text, using presentation provenance rather than guessing from whitespace or border characters.
- Normalize copy extraction in frame coordinates before constructing the immutable clipboard snapshot; preserve genuine indentation, selected text, internal blank lines, and existing visible row boundaries.
- Apply the same corrected payload to automatic selection copy and explicit frame copy, without modifying ordinary clipboard paste or editor-owned copy/cut.
- Add focused quote, paragraph, code-indentation, partial-selection, reverse-drag, Unicode, and copy/paste regression cases.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: exclude known assistant-rendering padding and quote decoration from copied block content while preserving semantic whitespace.

## Impact

Transcript presentation metadata, document/frame projection, selection extraction, and focused UI/shell tests. No new dependency, clipboard transport change, blanket paste dedenting, comparison-profile change, or integration authorization.
