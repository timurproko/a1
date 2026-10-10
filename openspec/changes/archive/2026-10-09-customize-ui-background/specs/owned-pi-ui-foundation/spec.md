## MODIFIED Requirements

### Requirement: Bare A1 projects one selected semantic accent across the active UI

Bare A1 SHALL derive its active presentation from the complete unmodified base Pi theme and, when `accentColor` names an A1 palette color, SHALL replace the semantic `accent` role plus the semantic `border`, `selectedBg`, `userMessageBg`, `mdHeading`, and `mdListBullet` roles used by dialog bars, selected rows, user prompts, secondary headings, active dialog-filter values, and Markdown list markers. The projected border and backgrounds SHALL be A1-owned tonal variations of the selected accent rather than the identical accent color; the border SHALL be a visibly darker neighboring-hue version of the accent, secondary headings, active dialog-filter values, keyboard-shortcut key spans, and Markdown list markers SHALL use a brighter complementary neighboring hue, filled scope/default state markers SHALL retain the neutral `text` role, selected backgrounds SHALL use a half-strength low-saturation tint closer to the terminal background or selected canvas, and list markers SHALL use the same derived secondary tone as active filters. Every owned, retained, shared-component, select-list, and extension-facing surface that requests semantic accent SHALL observe the same selected color for foreground painting, composed styles, ANSI lookup, and concrete color introspection. Every owned and retained package dialog bar SHALL observe the derived border through the live facade, while secondary headings, active dialog-filter values, selected rows, and visible user prompts SHALL observe their matching derived colors and existing relative prominence. A scrolled-out sticky prompt and the jump-to-bottom badge SHALL retain the base neutral `toolPendingBg` while resting and use the derived accent selection tone only when hovered. Every other semantic role SHALL retain the base theme's behavior and bytes; the independently configured fullscreen canvas SHALL alter only cells that otherwise use the terminal-default background.

Every derived family role SHALL be computed from the selected primary accent by one appearance-aware color transform rather than stored as a per-choice role color, and that transform SHALL accept an arbitrary concrete color so future custom accents inherit the same hierarchy. The active projection SHALL be reconstructed from the stored base theme after named-theme load, watched-file reload, terminal-appearance selection, or in-memory theme replacement. Reapplying a previously active projected in-memory theme SHALL unwrap to its original base and restore the same projected object identity for that base/accent pair. It SHALL NOT modify built-in or custom theme resources, write generated theme files, inspect the name `violet`, compare current purple/RGB values, infer related roles from equal colors, or derive repeatedly from an earlier projection. Roles such as general Markdown code outside the hotkeys document, syntax types, custom-message labels, muted borders, custom/tool backgrounds, and thinking-level colors SHALL remain independent unless they explicitly request semantic `accent`, the derived `mdHeading`, `mdListBullet`, dialog `border`, or the subtle derived `selectedBg` and `userMessageBg` surfaces.

A live accent change SHALL invalidate theme-sensitive content and repaint the active frame in the same session, including an accent-derived fullscreen canvas when selected. Purple SHALL be the initial explicit A1 palette choice and SHALL receive the same complete family projection as every other choice. `a1 pi` SHALL retain exact Pi theme behavior. If a future Pi release changes the semantic theme-token contract incompatibly, controlled upgrade validation SHALL fail by naming the drift rather than silently retaining a stale accent implementation.

#### Scenario: Apply a selected accent
- **WHEN** bare A1 has an `accentColor` preference
- **THEN** titles, cursors, selected markers, working indicators, accent scrollbars, dialogs, settings controls, and extension theme access that request `accent` SHALL use that choice
- **AND** every owned and retained package dialog bar that requests `border` SHALL use a visibly darker neighboring-hue variation of that choice
- **AND** secondary section/Markdown headings, active dialog-filter values, keyboard-shortcut key spans, and numbered/unordered Markdown list markers SHALL use a brighter complementary neighboring-hue variation distinct from primary titles, with blue and purple receiving the stronger sector-derived separation needed for a clear hierarchy
- **AND** filled scope/default state markers SHALL match the neutral model/item text color
- **AND** selected rows that request `selectedBg` SHALL use a half-strength low-chroma tonal variation closer to the underlying terminal background or selected canvas
- **AND** visible user prompts SHALL use a quieter low-prominence variation
- **AND** resting sticky prompts and jump-to-bottom badges SHALL remain neutral grey while their hovered states use the selection variation
- **AND** every other semantic foreground, component background, emphasis, spacing, and geometry SHALL remain unchanged apart from the independently selected fullscreen canvas

#### Scenario: Change the preference while content is visible
- **WHEN** the reader changes `accentColor` from one allowed value to another
- **THEN** the settings surface and existing shell content SHALL repaint in the same session
- **AND** an accent-derived canvas SHALL repaint from the new accent in that same frame
- **AND** no cached row or later-created accent consumer SHALL retain the previous value
- **AND** ordered and unordered list markers in already-finalized assistant content SHALL repaint to the new secondary/filter tone

#### Scenario: Derive the family from an arbitrary accent
- **WHEN** the owned transform receives a concrete accent that is not one of the named palette entries
- **THEN** border, secondary heading/filter, selected-row, user-message, and optional accent-canvas tones SHALL all derive from that input color
- **AND** no named palette ID or per-role color literal SHALL be required

#### Scenario: Keep the palette stable across an upstream accent change
- **WHEN** the base Pi theme's semantic accent differs from the value used by an earlier Pi release
- **THEN** bare A1 SHALL continue to use its selected explicit palette color for the enumerated accent family
- **AND** every unrelated role SHALL continue to come from the changed base theme

#### Scenario: Retain a selected choice across base-theme replacement
- **WHEN** a preference is active and the base theme reloads or is replaced
- **THEN** the selected accent SHALL be projected once over the new base theme
- **AND** every non-accent role SHALL come from that new base theme

#### Scenario: Preserve comparison parity
- **WHEN** the same base theme is used by `a1 pi`
- **THEN** no A1 accent or canvas projection SHALL be installed
- **AND** pinned Pi theme parity SHALL remain exact

## ADDED Requirements

### Requirement: Bare A1 paints one selected fullscreen canvas background

Bare A1 SHALL keep its fullscreen canvas transparent when `backgroundStyle` is `transparent`, paint a dark low-saturation canvas derived from the selected accent when it is `accent`, and paint a fixed neutral dark canvas when it is `dark`. An opaque canvas SHALL cover every visible terminal cell that would otherwise use the terminal-default background, including blank rows and cells exposed by scrolling, resizing, overlays, dialogs, and settings applications. Explicit semantic component backgrounds for selected rows, user and custom messages, tools, search matches, floating panels, dialogs, and extension content SHALL remain visible above that canvas and SHALL return to the canvas, not transparency, when their span ends.

The accent canvas SHALL derive its hue from the same concrete accent input used by the semantic accent family while reducing saturation and lightness to a dark greyish tone; it SHALL NOT use per-palette canvas literals. The neutral dark canvas SHALL remain independent of accent changes. Truecolor terminals SHALL receive the derived color, and limited-color terminals SHALL receive the nearest supported palette color without changing the selected setting.

Changing the background or an accent that supplies it SHALL replace the complete visible canvas in the same session rather than leaving stale cells from an earlier color. Full and differential repaint optimization, hyperlink cleanup, and explicit component backgrounds SHALL remain behaviorally correct. The selected canvas SHALL remain behind the quit animation until its final clear, and A1 SHALL restore the terminal-default background before leaving the alternate screen or emitting parent-terminal output. The setting SHALL NOT mutate the terminal's configured background, leak into unrelated control output, or affect `a1 pi`.

#### Scenario: Keep the canvas transparent
- **WHEN** `backgroundStyle` is `transparent`
- **THEN** bare A1 SHALL preserve the terminal's own background in every cell without an explicit component background
- **AND** its fullscreen frame output SHALL retain the existing transparent behavior

#### Scenario: Paint the accent canvas
- **WHEN** `backgroundStyle` is `accent`
- **THEN** every otherwise transparent cell SHALL use one dark low-saturation tone derived from the selected accent hue
- **AND** changing the selected accent SHALL repaint all such cells from the new hue without restart

#### Scenario: Paint the neutral canvas
- **WHEN** `backgroundStyle` is `dark`
- **THEN** every otherwise transparent cell SHALL use the fixed neutral dark tone
- **AND** changing the selected accent SHALL not change that canvas tone

#### Scenario: Preserve explicit surfaces
- **WHEN** a selected row, message, tool state, search match, floating panel, dialog, or extension surface paints an explicit background above an opaque canvas
- **THEN** that explicit background SHALL remain unchanged for its complete visible span
- **AND** a background reset at the end of the span SHALL reveal the selected canvas rather than the terminal background

#### Scenario: Replace the complete canvas live
- **WHEN** the resolved canvas changes while bare A1 is visible
- **THEN** every row and blank cell SHALL repaint before the change reports success
- **AND** no stale cell from the prior transparent, accent, or dark canvas SHALL remain after scroll, resize, full repaint, or differential repaint

#### Scenario: Preserve terminal lifecycle
- **WHEN** bare A1 paints an opaque canvas and then runs its quit animation or exits
- **THEN** the selected canvas SHALL remain behind visible animation cells until the final clear
- **AND** the parent terminal SHALL resume with its own configured background and no A1 canvas state

#### Scenario: Preserve comparison behavior
- **WHEN** `a1 pi` renders the same terminal content
- **THEN** no A1 canvas background SHALL be applied
- **AND** its terminal bytes and Pi theme behavior SHALL remain unchanged
