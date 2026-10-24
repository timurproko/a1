## Why

When the resident terminal is narrow, some tab chips disappear from the strip. Listing visible chips again in the overflow popup with checkmarks duplicates the strip and obscures the tabs the user can actually switch to. Plain hidden-tab names also omit the status icon shown on chips, so the user cannot distinguish a working or attention-needing tab before switching. Separately, the A1 footer's narrow-width truncation can show a bright three-column `...` beside otherwise muted path or usage text, and usage can crowd out the current model. In a bottom-positioned tab bar, clicking a named overflow row can activate a different tab. The strip's overflow and add menus currently require a pointer, and the overflow `…` is easy to confuse with truncation ellipses.

## What Changes

- Show only tabs without a drawn chip in the overflow popup, in their original tab order, without checkmarks. Reserve the same icon slot ahead of each hidden tab name as on strip chips, showing its current status glyph when one exists and leaving the slot blank when idle. Selecting one places its chip where the previously viewed chip was; when there is not enough room for both, the displaced chip becomes a menu item.
- Activate the exact named overflow row clicked, including with a bottom-positioned bar, instead of an adjacent tab. Keep the strip stable during the pending swap so the newly selected title takes the displaced chip's place without a transient old-tab repaint or replayed hidden-name animation. Keep keyboard and mouse actions, hidden-tab selection, and popup refresh across resize, create, close, reorder, and view changes without stale targets or overlay damage.
- Bind Alt+number to the visible chip in that left-to-right position; numbers beyond the currently drawn chips do nothing rather than selecting hidden or future tabs. Bind Alt+- to open the hidden-tab popup when the overflow control is drawn and Alt++ to open the existing add-tab popup. Show a muted single-column `-` instead of `…` on the overflow control while preserving its geometry, and keep the reserved `+` control.
- In the narrow A1 session footer, replace bright three-column `...` truncation markers in path and usage rows with a single-column dim `…`. When the full model name fits, truncate lower-priority usage and optional provider/level details first so the model stays visible, analogous to the reserved PR badge on the path row. Keep the footer within its width, preserve colored thinking-level segments and PR hyperlinks, and leave the Pi comparison profile unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: show only hidden chips with aligned live status glyphs in the overflow chooser, swap a selected hidden tab into the viewed chip's strip slot without a transient strip flash, bind Alt+number to drawn chip positions and Alt+-/Alt++ to the existing overflow/add menus, draw `-` on the overflow control, map each popup click to its exact row, and preserve responsive strip geometry.
- `owned-pi-ui-foundation`: render single-column dim footer truncation markers and keep the model identity visible when it fits at constrained widths.

## Impact

- Native tab strip/popup and attach coordination: `native/terminal-host/src/roles/strip.rs`, `native/terminal-host/src/core/attach/*`, and focused Rust tests/fixtures.
- A1 footer rendering: `src/integrations/pi/components/upstream/components/session-footer.ts` and focused footer/parity tests; account for the copied upstream component's provenance and A1-only deviations.
- No protocol change, setting, new dependency, or general tab-count limit is intended.
