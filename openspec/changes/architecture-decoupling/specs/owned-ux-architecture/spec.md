## ADDED Requirements

### Requirement: The product mode is decided once and has one name
Launch selection SHALL decide the product mode once, as `bare` for the full A1 surface or `comparison` for the pinned Pi comparison, and every layer SHALL carry that decision under the one name `productMode` and one type. Composition SHALL pass it to the engine host and derive the session layout from it. No module SHALL re-derive the mode from the session layout, the profile identifier, or a surface flag.

#### Scenario: A comparison launch is composed
- **WHEN** `a1 pi` is launched
- **THEN** launch selection, composition, the engine host, the trust prompt, and the session shell SHALL each see `productMode: "comparison"`
- **AND** the session layout SHALL be the pinned layout composition derived from that mode

#### Scenario: The shell needs the product mode
- **WHEN** the session shell behaves differently for the comparison profile, such as choosing workflow command names
- **THEN** it SHALL read the mode from the session backend's settings port
- **AND** it SHALL NOT infer the mode from whether the custom viewport is active

### Requirement: Ctrl+/ opens the Commands dialog
In bare A1, `Ctrl+/` SHALL open a searchable Commands dialog listing the slash commands the prompt menu offers, each with its description, whether the terminal sends the legacy control byte or a Kitty key sequence. Enter SHALL run a command that takes no arguments and place a command that takes arguments in the prompt for the user to finish; Escape SHALL close the dialog and keep the prompt. Because legacy terminals send `Ctrl+/` as the `Ctrl+-` byte, bare A1 SHALL undo prompt edits with `Ctrl+Z`, and `/hotkeys` SHALL list the shortcut.

#### Scenario: A command without arguments is chosen
- **WHEN** the user presses `Ctrl+/`, types part of a command name, and presses Enter on a command that takes no arguments
- **THEN** the dialog SHALL close and the command SHALL run

#### Scenario: A command with arguments is chosen
- **WHEN** the user picks a command that takes arguments
- **THEN** the dialog SHALL close and the prompt SHALL hold the command followed by a space

#### Scenario: The dialog is dismissed
- **WHEN** the user presses Escape in the dialog
- **THEN** the dialog SHALL close and the prompt SHALL be unchanged

## MODIFIED Requirements

### Requirement: Vendor knowledge stays behind the vendor boundary
Knowledge of a vendor's shapes, grammars, key names, and value encodings SHALL live in the adapter
layer that owns that vendor. A composition or wiring layer SHALL connect owners without interpreting
vendor data, and a feature SHALL read vendor-backed data only through a vendor-neutral contract. Where
a value list can only be resolved while running, the boundary SHALL expose it through a declared
provider rather than by wrapping a port in a layer above it. The application layer SHALL reach vendor presentation only through a declared record of vendor-neutral presentation ports that composition injects; it SHALL NOT import a vendor adapter module, a vendored source port, or a vendor-named type, and the architecture gate SHALL reject such an import without exemption.

#### Scenario: A vendor value has a composite grammar
- **WHEN** a vendor encodes more than one meaning in a single value
- **THEN** parsing and composing that value SHALL happen inside the vendor's adapter
- **AND** the layers above SHALL see the parts as ordinary contract fields

#### Scenario: A value list is only known at runtime
- **WHEN** the values a setting accepts depend on what is installed or configured when it is read
- **THEN** the boundary SHALL resolve them through a declared provider
- **AND** no layer above SHALL decorate the port to supply them

#### Scenario: The shell needs a vendor-rendered component
- **WHEN** the session shell needs an editor, dialog, selector, status reporter, or input classification that the vendor adapter renders
- **THEN** it SHALL obtain it from the injected presentation ports
- **AND** the architecture gate SHALL fail if any module under the application layer imports the vendor adapter directly

### Requirement: Colour and emphasis come from declared theme roles
Every painted element SHALL take its colour and emphasis from a declared theme role. A component SHALL
NOT write terminal escapes or literal colours at the point of use, so one theme decides how a surface
reads. Roles SHALL cover at least ordinary text, quiet text, accent, borders, and unavailable
controls. One vendor-neutral theme contract SHALL be the only theme module imported outside the vendor adapters; the vendor adapter SHALL map its theme into that contract's roles and SHALL NOT re-export the vendor theme whole. A generated palette SHALL exist once and be imported from one module.

#### Scenario: Paint an element
- **WHEN** a component paints text, a border, or a control
- **THEN** it SHALL name a theme role
- **AND** it SHALL NOT contain a literal colour or escape sequence of its own

#### Scenario: The vendor theme changes
- **WHEN** the vendor theme is reconfigured while the shell runs
- **THEN** the vendor adapter SHALL publish the change through the neutral theme source
- **AND** no module outside the adapter SHALL subscribe to the vendor theme directly
