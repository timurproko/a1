## Why

When the resident terminal is narrow, some tab chips disappear from the strip. Its overflow popup currently lists only the hidden tabs, so the user cannot see the complete tab order or tell which tabs are still visible on the strip. Separately, the A1 footer's narrow-width truncation can show a bright three-column `...` beside otherwise muted path or usage text, and usage can crowd out the current model. In a bottom-positioned tab bar, clicking a named overflow row can activate a different tab.

## What Changes

- Make the resident strip overflow popup show every available tab in strip order, including tabs still visible on the strip. Prefix each currently visible tab with a checkmark and leave hidden tabs unchecked; the mark describes strip visibility, not which tab is viewed.
- Activate the exact named overflow row clicked, including with a bottom-positioned bar, instead of an adjacent tab. Keep keyboard and mouse actions, hidden-tab selection, and popup refresh across resize, create, close, reorder, and view changes without stale targets or overlay damage.
- Keep the overflow trigger restricted to actual strip overflow and preserve the viewed chip and the reserved `+` control. Do not change the strip's existing one-column `…` glyph or its muted chip foreground.
- In the narrow A1 session footer, replace bright three-column `...` truncation markers in path and usage rows with a single-column dim `…`. When the full model name fits, truncate lower-priority usage and optional provider/level details first so the model stays visible, analogous to the reserved PR badge on the path row. Keep the footer within its width, preserve colored thinking-level segments and PR hyperlinks, and leave the Pi comparison profile unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: show the complete tab list with strip-visibility checkmarks in the overflow chooser, map each popup click to its exact row with either strip position, and preserve responsive strip geometry.
- `owned-pi-ui-foundation`: render single-column dim footer truncation markers and keep the model identity visible when it fits at constrained widths.

## Impact

- Native tab strip/popup and attach coordination: `native/terminal-host/src/roles/strip.rs`, `native/terminal-host/src/core/attach/*`, and focused Rust tests/fixtures.
- A1 footer rendering: `src/integrations/pi/components/upstream/components/session-footer.ts` and focused footer/parity tests; account for the copied upstream component's provenance and A1-only deviations.
- No protocol change, setting, new dependency, or general tab-count limit is intended.
