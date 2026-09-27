## Why

Complete-frame selection currently preserves indentation and blank padding at the outer edges of the selected payload. Selecting an indented command such as `   npm run develop` therefore places leading spaces on the clipboard and makes direct terminal reuse inconvenient.

## What Changes

- Trim Unicode whitespace only from the beginning and end of bare A1 complete-frame selection payloads before clipboard delivery.
- Preserve whitespace between the first and last non-whitespace characters, including multiline indentation and internal blank lines.
- Apply the same normalization to automatic release copying and explicit `Ctrl+C` copying of a retained frame selection.
- Keep prompt-local copy/cut, semantic `/copy`, `a1 pi`, and terminal-owned regular-mode selection unchanged.
- Keep copy acknowledgements truthful to the normalized clipboard payload, including quiet delivery when a whitespace-only selection normalizes to empty text.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Normalize outer whitespace in complete-frame clipboard payloads without changing the selected visual range or other copy routes.

## Impact

Expected implementation areas are complete-frame snapshot capture, empty-payload clipboard preparation, and focused selection/copy tests. The change adds no dependency or setting, changes no persisted data, and does not patch installed Pi code.
