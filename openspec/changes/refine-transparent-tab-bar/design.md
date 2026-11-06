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

The strip renderer will derive inactive/control styling from `StripCanvas`. For `Transparent`, inactive tabs, overflow, and `+` will emit the default-background SGR rather than fixed RGB `38,38,38` at rest. Their hover state will reuse the owned popup menus' accent-selected background token while retaining each control's resting foreground, producing a restrained cell background without turning the label into accent-colored text. Status glyphs retain their semantic colors, and the active chip keeps its existing accent fill.

Black and Accent canvases will keep explicit readable resting backgrounds and palette fallbacks, then use the same menu-hover token for interaction consistency. Centralizing these states in canvas-aware style helpers avoids separate visual rules for tabs and controls.

Terminal SGR backgrounds are opaque, so this refinement deliberately uses the existing subtle menu token rather than pretending to alpha-blend with an unknown terminal default. The block appears only while hovered and is bounded by the unchanged target geometry.

### D2. The right side is one rendered interaction group

The renderer will emit one hover/hit identity spanning the physically rendered right-side content, including the Version/Time separator when both are present. Hovering any cell will style all visible right-side text with the same canvas-aware treatment used by other strip controls. Right-clicking any cell continues to open the existing Configure menu and Right Side multi-select.

Narrow layout computes the group from the items that remain visible, so omitted Version text owns no cells. This preserves current width reservation and child-input boundaries while removing separate Version and Time hover regions that imply separate configuration actions.

### D3. The empty shell is a ready Agent prompt

The empty resident body will use the existing pending-Agent editor and status-footer visual language instead of a passive wordmark. It keeps the launch cwd in the same footer position, omits the package version, and owns a bounded local draft while no child is viewed. Printable input, ordinary single-line editing, and paste update that draft without starting a process; Enter on a non-empty draft creates one Agent and queues the draft plus submit action for that exact pending creation. The pending chip/editor appears immediately, and the queued input is released only after the created Agent commits its view.

This keeps the initial shell useful without sending input to a hidden utility or an unrelated tab. Empty Enter does nothing, tab shortcuts and `+` retain precedence, and cancellation or creation failure discards the bound draft rather than leaking it to a later Agent.

### D4. Rendering assertions cover styles and geometry together

Focused native tests will assert SGR background ownership, menu-consistent accent hover output with stable label foregrounds, unchanged hit spans, grouped right-side targeting, palette fallback, and the version-free landing cell grid. Existing active-chip, overflow, narrow-layout, and canvas tests will be updated rather than replaced so the visual refinement cannot regress interaction geometry.

## Risks / Trade-offs

- **An opaque hover cell can contrast with an unknown terminal default** → Reuse the already approved subtle menu-hover token only during hover, preserve resting transparency, and retain semantic status colors.
- **Changing hit identities can disturb context-menu routing** → Keep one explicit right-configuration action from renderer through the attach state machine and cover right-click behavior at both strip positions.
- **Default-background resets can expose stale cells** → Continue repainting the full strip row on every strip frame and assert that child output never owns strip content.
- **A landing draft could leak to the wrong process** → Bind submission to the one pending Agent creation, release it only after that view commits, and discard it on cancellation or failure.
- **Palette terminals cannot reproduce truecolor accents exactly** → Map the hover foreground through the existing palette color strategy and assert stable fallback bytes and geometry.

## Migration Plan

The change is presentation-only and applies live when the rebuilt attach client starts. No persisted setting or protocol migration is required. Reverting the renderer and landing changes restores the prior visuals without data conversion.
