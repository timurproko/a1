## Why

Transcript content and the scrollbar shift horizontally on rows containing text-presentation pictographs such as `🖼`. A1's shared width helper counts these as two columns because they fall inside a broad pictograph range, while the pinned Pi renderer and terminal count the unqualified symbol as one. Padding, overlays, truncation, and selection consequently disagree about cell positions across sessions.

## What Changes

- Replace broad supplementary-plane pictograph-width assumptions with built-in Unicode emoji-presentation properties while retaining existing ordinary East Asian width ranges and focused compatibility with pinned Pi.
- Keep the shared implementation vendor-neutral so component geometry, padding, truncation, overlays, and selection use the corrected widths without importing Pi into UI components.
- Preserve true double-width emoji sequences, CJK, combining text, ANSI opacity, and the printable-ASCII fast path.
- Add focused width, span/selection, and terminal-replayed viewport regressions for bare, VS15 text-qualified, VS16 emoji-qualified, repeated, and styled pictographs, including a second affected symbol beyond `🖼`.
- Cover truncation/overlay edges, forward and reverse selection/copy boundaries, and fixed final-column rails through cached-row reuse, content repaint, scrolling, resizing, and dock-height changes.
- Identify runtime Unicode data and any exact test-only width-data dependency; limit Pi compatibility claims to the tested geometry rather than all Unicode text.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: distinguish narrow text-presentation pictographs from wide emoji when measuring and composing terminal columns.

## Impact

Shared text geometry in `src/ui/components/text.ts`, its existing consumers, and focused component/viewport and Pi-conformance tests. Production emoji classification uses built-in runtime Unicode properties; any retained test-only width-data dependency must be directly and exactly declared. No installed Pi patch, Herdr change, screenshot-chip relabelling, engine change, or scrollbar-position workaround.
