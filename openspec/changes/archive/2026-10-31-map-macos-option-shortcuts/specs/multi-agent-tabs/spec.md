## ADDED Requirements

### Requirement: macOS Option characters trigger bound tab shortcuts
On macOS, the attach client SHALL treat an unmodified or Shift-only character key whose character the macOS ABC/US Option layer produces for a base key as that base key's `Alt` chord when, and only when, the chord resolves to a tab action. It SHALL then dispatch that action exactly as for the `Alt` chord and SHALL forward no input for that key to the child. The Option layer SHALL map `1`…`0` to `¡ ™ £ ¢ ∞ § ¶ • ª º`, the letters without dead keys `a b c d f g h j k l m o p q r s t v w x y z` to `å ∫ ç ∂ ƒ © ˙ ∆ ˚ ¬ µ ø π œ ® ß † √ ∑ ≈ ¥ Ω`, and `, . / ; ' [ ] \ - =` to `≤ ≥ ÷ … æ “ ‘ « – ≠`. A mapped character whose `Alt` chord is unbound or bound to a non-tab action SHALL be typed as before. `ESC`-prefixed and kitty-protocol `Alt` input SHALL keep its existing handling, and the mapping SHALL NOT apply on Windows or Linux.

#### Scenario: Option+1 selects the first tab
- **WHEN** the user presses Option+1 on macOS in a terminal that sends `¡` and `tabs.jump1` keeps its default `Alt+1`
- **THEN** the first tab SHALL be viewed
- **AND** no `¡` SHALL reach the child or appear in the prompt

#### Scenario: Default tab actions work with Option
- **WHEN** the user presses Option+A, Option+W, Option+Comma, or Option+Slash on macOS with default bindings
- **THEN** a new Agent tab SHALL be created, the tab SHALL be closed, Settings SHALL open, or Commands SHALL open respectively
- **AND** none of `å`, `∑`, `≤`, or `÷` SHALL reach the child

#### Scenario: An unbound Option character still types
- **WHEN** the user presses Option+P on macOS and `Alt+P` is not bound to a tab action
- **THEN** `π` SHALL be forwarded to the child unchanged

#### Scenario: A rebound action follows its new chord
- **WHEN** `tabs.new` is rebound from `Alt+A` to `Alt+N` and the user presses Option+A on macOS
- **THEN** `å` SHALL be typed and no tab SHALL be created

#### Scenario: Other platforms are unchanged
- **WHEN** a Windows or Linux attach client receives `¡` as an unmodified character
- **THEN** it SHALL forward `¡` to the child and dispatch no tab action
