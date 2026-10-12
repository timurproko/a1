## Why

Read-tool call ranges such as `:95-264` currently use the warning color, making ordinary location metadata look like a warning and leaving it fixed yellow when the reader selects another accent. The range should use the same accent-derived secondary tone as Settings section headings such as `Generic`.

## What Changes

- Render built-in read-tool line-range suffixes with the active theme's secondary-heading role in bare A1.
- Keep the read title/path, range text and calculation, geometry, extension-provided renderers, and actual warning presentation unchanged.
- Repaint existing and new read-call ranges when the accent changes, while preserving exact pinned behavior in `a1 pi`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Declare read-call line ranges as secondary accent metadata in bare A1 while preserving warning semantics and comparison-profile parity.

## Impact

The change affects the owned Pi tool-rendering boundary, its bare-A1/comparison mode selection, and focused read-renderer/theme regressions. It does not change tool schemas, read execution, result content, theme resources, persisted settings, dependencies, or installed Pi package files.
