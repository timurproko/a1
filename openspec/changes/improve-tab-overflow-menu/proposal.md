## Why

When the resident terminal is narrow, some tab chips disappear from the strip. Its overflow popup currently lists only the hidden tabs, so the user cannot see the complete tab order or tell which tabs are still visible on the strip. Separately, the A1 footer's narrow-width truncation can show a bright three-column `...` beside otherwise muted usage text.

## What Changes

- Make the resident strip overflow popup show every available tab in strip order, including tabs still visible on the strip. Prefix each currently visible tab with a checkmark and leave hidden tabs unchecked; the mark describes strip visibility, not which tab is viewed.
- Continue to allow selecting any tab from the popup, including a hidden tab, using the existing mouse and keyboard actions. Recompute the list and markers after resize, create, close, reorder, and view changes without stale targets or overlay damage.
- Keep the overflow trigger restricted to actual strip overflow and preserve the viewed chip and the reserved `+` control. Do not change the strip's existing one-column `…` glyph or its muted chip foreground.
- In the narrow A1 session footer, replace the bright three-column `...` truncation marker with a single-column `…` painted in the same dim role as the neighboring usage text. Keep the footer within its width, preserve colored thinking-level segments and PR hyperlinks, and leave the Pi comparison profile's presentation unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: show the complete tab list with strip-visibility checkmarks in the overflow chooser while preserving tab selection and responsive strip geometry.
- `owned-pi-ui-foundation`: render a single-column dim truncation marker in the A1 session footer at constrained widths.

## Impact

- Native tab strip/popup and attach coordination: `native/terminal-host/src/roles/strip.rs`, `native/terminal-host/src/core/attach/*`, and focused Rust tests/fixtures.
- A1 footer rendering: `src/integrations/pi/components/upstream/components/session-footer.ts` and focused footer/parity tests; account for the copied upstream component's provenance and A1-only deviations.
- No protocol change, setting, new dependency, or general tab-count limit is intended.
