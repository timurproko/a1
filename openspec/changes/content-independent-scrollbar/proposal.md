## Why

The transcript scrollbar is logically assigned a fixed gutter but physically emitted inline with each content row. Content-dependent cursor advance can therefore shift or remove individual rail cells even when A1 reports an exactly full-width frame. A reported Herdr screenshot shows this broken-rail symptom beside queued steering messages.

## What Changes

- Make transcript row geometry and row-control handling consistent before padding, clipping, selection, and rail composition, including invisible Unicode, tabs, carriage returns, and styling inside grapheme clusters.
- Carry semantic rail-cell placement to the terminal presentation boundary and paint the exposed rail at its declared physical column independently of preceding content advance.
- Preserve existing scrollbar appearance/style, gutter backgrounds, selection/copy boundaries, image transport, modal occlusion, dock placement, and bounded differential rendering.
- Add independent terminal-cell regressions for static and changing hostile-content fixtures rather than relying solely on A1's own width assertions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: content-independent scrollbar placement and safe, geometry-consistent transcript rows.

## Impact

Expected owners: neutral UI text/span geometry, transcript frame composition and metadata, presentation contracts, shell frame handoff, and the existing Pi terminal adapter. Tests cover neutral geometry, composed viewport rows, and actual emitted terminal writes. No external Herdr implementation changes, new terminal parser/emulator, dependency upgrade, or change to pinned comparison-profile behavior is proposed.

This is a planning-only change. Product implementation requires approval and an explicit implementation request.
