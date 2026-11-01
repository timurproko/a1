## ADDED Requirements

### Requirement: macOS Option characters trigger bound tab shortcuts
On macOS, while the active keyboard layout is ABC or U.S., the attach client SHALL treat an unmodified or Shift-only character key whose character the macOS ABC/US Option layer produces for a base key as that base key's `Alt` chord when, and only when, the chord resolves to a tab action. Under any other layout, where characters such as `å`, `£`, `§`, and `¡` are ordinary keys, it SHALL forward them unchanged. The client SHALL read the active layout only for such a bound candidate and SHALL reflect a layout switch within about one second. It SHALL then dispatch that action exactly as for the `Alt` chord and SHALL forward no input for that key to the child. The Option layer SHALL map `1`…`0` to `¡ ™ £ ¢ ∞ § ¶ • ª º`, the letters without dead keys `a b c d f g h j k l m o p q r s t v w x y z` to `å ∫ ç ∂ ƒ © ˙ ∆ ˚ ¬ µ ø π œ ® ß † √ ∑ ≈ ¥ Ω`, and `, . / ; ' [ ] \ - =` to `≤ ≥ ÷ … æ “ ‘ « – ≠`. A mapped character whose `Alt` chord is unbound or bound to a non-tab action SHALL be typed as before. `ESC`-prefixed and kitty-protocol `Alt` input SHALL keep its existing handling, and the mapping SHALL NOT apply on Windows or Linux.

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

#### Scenario: Another layout types the character
- **WHEN** the active macOS layout is Swedish and the user presses the `å` key
- **THEN** `å` SHALL be forwarded to the child and no tab SHALL be created

#### Scenario: Other platforms are unchanged
- **WHEN** a Windows or Linux attach client receives `¡` as an unmodified character
- **THEN** it SHALL forward `¡` to the child and dispatch no tab action

### Requirement: macOS shortcut labels name Alt Option everywhere
On macOS, every shortcut label A1 renders SHALL name the Alt modifier `Option` with the same `+`-joined form and key casing as other platforms, so one naming system covers the attach client's tab context menu, `+` menu, Commands palette, and failed-tab banner, the Keyboard Shortcuts document, modal and footer shortcut hints, and A1-owned messages that name a shortcut. `Ctrl+` and `Shift+` SHALL stay unchanged, and Windows and Linux SHALL keep `Alt+`. Where another requirement names a label such as `Alt+W`, `Alt+,`, or `Alt+/`, macOS SHALL present `Option+W`, `Option+,`, or `Option+/`. The failed-tab banner SHALL name the effective `tabs.close` shortcut and SHALL omit the close hint when that action is unbound.

#### Scenario: The tab menu on macOS
- **WHEN** the user opens a tab's context menu on macOS with default bindings
- **THEN** the menu SHALL show `Close  Option+W` and `Rename  F2`

#### Scenario: Labels agree across surfaces on macOS
- **WHEN** `tabs.settings` keeps `Alt+,` on macOS
- **THEN** the `+` menu, Commands palette, and Keyboard Shortcuts Tabs table SHALL all show `Option+,`
- **AND** a modal hint for an `alt+up` binding SHALL show `Option+Up`

#### Scenario: Other platforms keep Alt
- **WHEN** the same menus and hints render on Windows or Linux
- **THEN** they SHALL show `Close  Alt+W`, `Alt+,`, `Alt+Up`, and `Ctrl+X` as before

#### Scenario: A failed tab's close hint follows its binding
- **WHEN** a failed tab is viewed on macOS and `tabs.close` keeps `Alt+W`
- **THEN** the banner SHALL read `Tab failed · R retry · F start fresh · Option+W close`
- **AND** when `tabs.close` is unbound the banner SHALL read `Tab failed · R retry · F start fresh`
