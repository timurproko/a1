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

Black and Accent canvases keep their existing readable inactive-tab and overflow treatment, but `+` rests directly on the configured strip canvas just as the grouped right side already does. Hovering either `+` or the right-side group uses the same canvas-relative lightening: Black becomes a lighter neutral black, while Accent becomes a lighter form of its accent canvas. Truecolor and palette paths derive the same state, and the target geometry remains unchanged.

Terminal SGR backgrounds are opaque, so Transparent continues to use the existing subtle menu token rather than pretending to alpha-blend with an unknown terminal default. Black and Accent can safely derive a less jarring hover from their known canvas RGB values. Centralizing the canvas-resting and canvas-hover states in one helper keeps `+` and the right-side group visually identical without changing inactive tabs.

### D2. The right side is one rendered interaction group

The renderer will emit one hover/hit identity spanning the physically rendered right-side content, including a ` • ` Version/Time separator when both are present and one blank padding cell before and after the visible text. Hovering any cell will style the complete padded span with the same canvas-aware treatment used by other strip controls, matching the visual breathing room around `+`. Right-clicking any cell continues to open the existing Configure menu and Right Side multi-select.

Narrow layout computes the group from the items that remain visible, so omitted Version text owns no cells. The added leading cell participates in width reservation while the existing final blank cell becomes the trailing group padding; the final visible item keeps its current right alignment while the wider separator moves Version one cell left. This preserves valid child-input boundaries while removing separate Version and Time hover regions that imply separate configuration actions.

### D3. The empty shell is a ready Agent prompt

The empty resident body will use the existing pending-Agent editor and status-footer visual language instead of a passive wordmark. It keeps the launch cwd in the same footer position, omits the package version, and owns a bounded local draft while no child is viewed. Printable input, ordinary single-line editing, and paste update that draft without starting a process; Enter on a non-empty draft creates one Agent and queues the draft plus submit action for that exact pending creation. The pending chip/editor appears immediately, and the queued input is released only after the created Agent commits its view.

This keeps the initial shell useful without sending input to a hidden utility or an unrelated tab. As soon as Enter accepts a non-empty draft, the provisional pending-Agent body echoes that submitted text using the final submitted-message composition: the accent-projected `userMessageBg` fills the row, a muted ` ❯ ` prefix precedes normal message text, and the submission time is right-aligned in the configured 12- or 24-hour format when width permits. The editor is left empty, so the action feels immediate while process creation continues. The native preview pins the same dark A1 semantic colors and accent projection already shared with owned rendering, including palette fallback; custom child-only theme state is unavailable before the child starts. The provisional row is presentation-only: it does not alter deferred delivery, and the first real Agent surface replaces it. Empty Enter does nothing, tab shortcuts and `+` retain precedence, and cancellation or creation failure discards the bound submission rather than leaking it to a later Agent.

### D4. Rendering assertions cover styles and geometry together

Focused native tests will assert SGR background ownership, menu-consistent accent hover output with stable label foregrounds, stable padded hit spans, grouped right-side targeting, final-design provisional submitted-prompt geometry and styling, palette fallback, and the version-free landing cell grid. Existing active-chip, overflow, narrow-layout, and canvas tests will be updated rather than replaced so the visual refinement cannot regress interaction geometry.

## Risks / Trade-offs

- **An opaque hover cell can contrast with its strip canvas** → Keep the approved menu token for unknown Transparent backgrounds, but derive Black and Accent hovers by subtly lightening their known canvas RGB values; preserve resting canvas ownership and semantic label colors.
- **Changing hit identities can disturb context-menu routing** → Keep one explicit right-configuration action from renderer through the attach state machine and cover right-click behavior at both strip positions.
- **Default-background resets can expose stale cells** → Continue repainting the full strip row on every strip frame and assert that child output never owns strip content.
- **A landing draft could leak to the wrong process** → Bind submission to the one pending Agent creation, release it only after that view commits, and discard it on cancellation or failure; keep the immediate content echo strictly presentation-only.
- **Palette terminals cannot reproduce truecolor accents exactly** → Map the hover foreground through the existing palette color strategy and assert stable fallback bytes and geometry.

## Migration Plan

The change is presentation-only and applies live when the rebuilt attach client starts. No persisted setting or protocol migration is required. Reverting the renderer and landing changes restores the prior visuals without data conversion.
