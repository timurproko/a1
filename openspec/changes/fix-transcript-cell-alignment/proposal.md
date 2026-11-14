## Why

Transcript content and the scrollbar shift horizontally on rows containing text-presentation pictographs such as `🖼`. A1's shared width helper counts these as two columns because they fall inside a broad pictograph range, while the pinned Pi renderer and terminal count the unqualified symbol as one. Padding, overlays, truncation, and selection consequently disagree about cell positions across sessions.

## What Changes

- Replace broad pictograph-range width assumptions with Unicode East Asian Width and explicit emoji-presentation handling consistent with pinned Pi.
- Keep the shared implementation vendor-neutral so component geometry, padding, truncation, overlays, and selection use the corrected widths without importing Pi into UI components.
- Preserve true double-width emoji sequences, CJK, combining text, ANSI opacity, and the printable-ASCII fast path.
- Add focused width, span/selection, and terminal-replayed viewport regressions for plain and repeated text-presentation pictographs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: distinguish narrow text-presentation pictographs from wide emoji when measuring and composing terminal columns.

## Impact

Shared text geometry in `src/ui/components/text.ts`, its existing consumers, focused component/viewport and Pi-conformance tests, and a direct Unicode width-data dependency if required. No installed Pi patch, Herdr change, screenshot-chip relabelling, engine change, or scrollbar-position workaround.
