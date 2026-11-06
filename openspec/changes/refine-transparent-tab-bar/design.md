## Context

See `proposal.md` for motivation. The native strip renderer already receives the resolved tab-bar canvas and active accent, but inactive chips and controls still emit fixed neutral RGB backgrounds. Right-side Version and Time are rendered and hit-tested as separate targets even though both open the same configuration surface. The no-tab landing independently renders the package version below its cwd while the strip can also show Version.

## Goals / Non-Goals

**Goals:**

- Make transparent strip chrome visually inherit the user's terminal canvas without changing control geometry.
- Use one restrained, accent-derived hover language across inactive tabs, overflow, `+`, and the right-side configuration group.
- Make the rendered right-side group one pointer target and remove the redundant landing-body version.
- Preserve deterministic truecolor and palette output for top, bottom, narrow, and empty layouts.

**Non-Goals:**

- Changing the selected-tab treatment, tab actions, popup contents, or settings schema.
- Removing or changing the optional right-side Version item.
- Introducing transparency simulation, alpha blending, or terminal-theme detection that the terminal protocol cannot provide reliably.

## Decisions

### D1. Transparent resting controls use the terminal background

The strip renderer will derive inactive/control styling from `StripCanvas`. For `Transparent`, inactive tabs, overflow, and `+` will emit the default-background SGR rather than fixed RGB `38,38,38`. Their hover state will also retain the default background and add an accent-derived foreground lift, so feedback is visible without creating an opaque rectangle. Status glyphs retain their semantic colors, and the active chip keeps its existing accent fill.

Black and Accent canvases will keep explicit readable backgrounds and palette fallbacks. Centralizing these states in canvas-aware style helpers avoids separate visual rules for tabs and controls.

An accent foreground was chosen over an approximated translucent RGB background because the renderer cannot know or blend with an arbitrary terminal default background. Fixed low-opacity-looking RGB values would recreate the same detached block on different terminal themes.

### D2. The right side is one rendered interaction group

The renderer will emit one hover/hit identity spanning the physically rendered right-side content, including the Version/Time separator when both are present. Hovering any cell will style all visible right-side text with the same canvas-aware treatment used by other strip controls. Right-clicking any cell continues to open the existing Configure menu and Right Side multi-select.

Narrow layout computes the group from the items that remain visible, so omitted Version text owns no cells. This preserves current width reservation and child-input boundaries while removing separate Version and Time hover regions that imply separate configuration actions.

### D3. The landing has one identity source and one context line

The empty landing renderer will keep its wordmark and cwd rows but leave the row below the cwd blank. Its package-version field and rendering branch will be removed or made unreachable so the version cannot reappear on short or bottom-positioned layouts. The attach client's release version remains available to the strip's independently configurable Version item.

### D4. Rendering assertions cover styles and geometry together

Focused native tests will assert SGR background ownership, accent hover output, unchanged hit spans, grouped right-side targeting, palette fallback, and the version-free landing cell grid. Existing active-chip, overflow, narrow-layout, and canvas tests will be updated rather than replaced so the visual refinement cannot regress interaction geometry.

## Risks / Trade-offs

- **Accent-only hover may be subtler on low-contrast terminal themes** → Use the resolved A1 accent with a consistent emphasis token and retain semantic status colors.
- **Changing hit identities can disturb context-menu routing** → Keep one explicit right-configuration action from renderer through the attach state machine and cover right-click behavior at both strip positions.
- **Default-background resets can expose stale cells** → Continue repainting the full strip row on every strip frame and assert that child output never owns strip content.
- **Palette terminals cannot reproduce truecolor accents exactly** → Map the hover foreground through the existing palette color strategy and assert stable fallback bytes and geometry.

## Migration Plan

The change is presentation-only and applies live when the rebuilt attach client starts. No persisted setting or protocol migration is required. Reverting the renderer and landing changes restores the prior visuals without data conversion.
