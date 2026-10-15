# Spec Delta

## MODIFIED Requirements

### Requirement: Tabs are renamed inline and names are Pi session names
`F2`, the chip menu, and existing `/name <name>` SHALL rename a tab. Inline rename SHALL use `Enter` to commit and `Esc` or click elsewhere to cancel. Names SHALL be trimmed, control-free, nonempty, and at most 64 characters; invalid input SHALL retain the editor with a concise reason. A committed name SHALL become the Pi session name, appear in every client, and be user-provided. Defaults SHALL be `agent` or the smallest free `agent N`. With `tabsAutoName` on by default, A1 SHALL start proposing a lowercase hyphenated name of at most 16 characters when the first agent run begins, without waiting for that turn to settle. Naming SHALL use bounded model work that permits reasoning models to produce the short answer, SHALL fall back deterministically, and SHALL never override a user name. An automatic rename SHALL reproduce v2's title transition: 600 ms moving per-character rainbow over the old title, the new title typed at 45 ms per character, and a 300 ms settle to foreground gray while preserving the wider endpoint width; terminals without truecolor SHALL use the plain typewriter phase. Manual renames SHALL not animate.

#### Scenario: Rename inline
- **WHEN** the user enters `auth-refactor` with `F2`
- **THEN** every client and the Pi session SHALL use `auth-refactor`

#### Scenario: Auto-name starts with the run
- **WHEN** the first agent run begins and remains busy for an extended period
- **THEN** automatic naming SHALL proceed without waiting for the run to settle

#### Scenario: Reasoning model consumes the first budget
- **WHEN** the naming model spends the first bounded attempt without producing title text
- **THEN** A1 SHALL retry with a larger bounded budget before using the deterministic fallback

#### Scenario: User name survives auto-name
- **WHEN** the user renames before auto-naming completes
- **THEN** auto-naming SHALL NOT change either the Pi session name or the tab name

#### Scenario: Auto-name animates
- **WHEN** an automatic name replaces a default name in a truecolor terminal
- **THEN** the old title SHALL show the moving per-character rainbow before the new title is typed and settled to foreground gray
- **AND** active frames SHALL retain the display width of the wider clipped endpoint

#### Scenario: Auto-name animates without truecolor
- **WHEN** an automatic name replaces a default name in a terminal without truecolor
- **THEN** the new title SHALL use the plain typewriter timing without truecolor rainbow or settle escapes

#### Scenario: Manual rename is immediate
- **WHEN** a user-provided name replaces the current name
- **THEN** the complete new title SHALL appear without an automatic-title animation

#### Scenario: Auto-name fails
- **WHEN** bounded model naming fails or times out
- **THEN** deterministic prompt-derived naming SHALL be used without affecting the active turn
