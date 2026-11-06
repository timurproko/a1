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

Black keeps its existing readable dark inactive-tab and overflow treatment. On Accent, inactive tabs instead rest directly on the accent canvas and hover with the same lighter accent canvas used by controls, avoiding unrelated dark blocks. On both Black and Accent, `+` rests directly on the configured strip canvas just as the grouped right side already does. Hovering either `+` or the right-side group uses the same canvas-relative lightening: Black becomes a lighter neutral black, while Accent becomes a lighter form of its accent canvas. Truecolor and palette paths derive the same state, and target geometry remains unchanged.

Terminal SGR backgrounds are opaque, so Transparent continues to render inactive tabs as text on the terminal default at rest and uses the existing subtle menu token on hover rather than pretending to alpha-blend with an unknown terminal default. Black preserves its current inactive-tab styling. Accent can safely let inactive tabs inherit its known canvas and use a hue-consistent lighter hover. Centralizing known-canvas control states keeps `+` and the right-side group visually identical, while an Accent-only inactive-tab branch preserves the approved Black and Transparent designs.

### D2. The right side is one rendered interaction group

The renderer will emit one hover/hit identity spanning the physically rendered right-side content, including a ` • ` Version/Time separator when both are present and one blank padding cell before and after the visible text. Hovering any cell will style the complete padded span with the same canvas-aware treatment used by other strip controls, matching the visual breathing room around `+`. Right-clicking any cell continues to open the existing Configure menu and Right Side multi-select.

The configuration concept is presented to users as `Widgets`: the Settings row and native multi-select title both use that label, and the dialog describes choosing which widgets the tab bar shows. Internal `rightItems` storage, actions, and protocol-free native state retain their existing identities, so the copy change requires no migration.

Narrow layout computes the group from the items that remain visible, so omitted Version text owns no cells. The added leading cell participates in width reservation while the existing final blank cell becomes the trailing group padding; the final visible item keeps its current right alignment while the wider separator moves Version one cell left. This preserves valid child-input boundaries while removing separate Version and Time hover regions that imply separate configuration actions.

### D3. The empty shell is a ready Agent prompt

The empty resident body will use the existing pending-Agent editor and status-footer visual language instead of a passive wordmark. It keeps the launch cwd in the same footer position, omits the package version, and owns a bounded local draft while no child is viewed. Printable input, ordinary single-line editing, and paste update that draft without starting a process; Enter on a non-empty draft creates one Agent and queues the draft plus submit action for that exact pending creation. The pending chip/editor appears immediately, and the queued input is released only after the created Agent commits its view.

This keeps the initial shell useful without sending input to a hidden utility or an unrelated tab. As soon as Enter accepts a non-empty draft, the provisional pending-Agent body echoes that submitted text using the final submitted-message composition: one blank breathing row precedes it, the accent-projected `userMessageBg` fills the next row, a muted ` ❯ ` prefix precedes normal message text, and the submission time is right-aligned in the configured 12- or 24-hour format when width permits. The editor is left empty, so the action feels immediate while process creation continues. The native preview pins the same dark A1 semantic colors and accent projection already shared with owned rendering, including palette fallback; custom child-only theme state is unavailable before the child starts. The provisional row is presentation-only and does not alter deferred delivery. The first committed child surface exists before the deferred prompt frames reach the Agent, so replacing the preview at that boundary briefly reveals the empty editor. Instead, the attach client caches that first surface while continuing to paint the provisional shell; after all deferred input has been queued, the next coherent live surface from the same Agent replaces the preview directly. Cancellation, creation failure, or an explicit view change clears the hold, preventing it from covering another tab or surviving a failed submission. Empty Enter does nothing, and tab shortcuts and `+` retain precedence.

### D4. Hover ownership follows current geometry

A pointer hover belongs to the control geometry under the pointer when that event is observed, not permanently to a control identity. Creating or opening a tab can insert a chip before `+` and move `+` away from a stationary pointer. The state machine therefore clears strip hover when it schedules a topology-changing create/open action; only a fresh pointer event can acquire hover on the relocated control. This avoids transferring the old `+` hover to a new screen position while preserving ordinary hover across repaints whose geometry is unchanged.

### D5. Rendering assertions cover styles and geometry together

Focused native tests will assert SGR background ownership, menu-consistent accent hover output with stable label foregrounds, stable padded hit spans, grouped right-side targeting, final-design provisional submitted-prompt geometry and styling, flash-free activation handoff, palette fallback, and the version-free landing cell grid. Existing active-chip, overflow, narrow-layout, and canvas tests will be updated rather than replaced so the visual refinement cannot regress interaction geometry.

## Risks / Trade-offs

- **An opaque hover cell can contrast with its strip canvas** → Keep the approved menu token for unknown Transparent backgrounds, but derive Black and Accent hovers by subtly lightening their known canvas RGB values; preserve resting canvas ownership and semantic label colors.
- **Changing hit identities can disturb context-menu routing** → Keep one explicit right-configuration action from renderer through the attach state machine and cover right-click behavior at both strip positions.
- **Default-background resets can expose stale cells** → Continue repainting the full strip row on every strip frame and assert that child output never owns strip content.
- **A landing draft or held preview could leak to the wrong process** → Bind submission and preview ownership to the one pending Agent, release input only after that view commits, and clear the hold on cancellation, failure, or view change; keep the immediate content echo strictly presentation-only.
- **Palette terminals cannot reproduce truecolor accents exactly** → Map the hover foreground through the existing palette color strategy and assert stable fallback bytes and geometry.

## Migration Plan

The change is presentation-only and applies live when the rebuilt attach client starts. No persisted setting or protocol migration is required. Reverting the renderer and landing changes restores the prior visuals without data conversion.
