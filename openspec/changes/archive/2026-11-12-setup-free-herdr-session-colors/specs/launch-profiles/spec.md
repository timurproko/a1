## MODIFIED Requirements

### Requirement: Maintenance commands remain unambiguous

`--help`, `-h`, `--version`, `-v`, `update`, and the declared operations under `a1 pi` SHALL retain their maintenance meanings and SHALL NOT be interpreted as profile names or forwarded into an interactive runtime. `a1 update --develop` MAY carry one numbered or full-version preview selector. A prerelease build SHALL expose bare `a1 pi` as its comparison launch; a release build SHALL treat that launch form as unsupported.

Normal A1 SHALL additionally recognize `a1 --session <path|id>` with an optional `--session-dir <dir>` in either option order as an interactive launch using the A1 profile. Normal interactive launch SHALL accept at most one `--session-color <name>`, alone or alongside session selection in either order, accepting exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey`. These owned options SHALL NOT be interpreted as maintenance operations or forwarded as options into Pi package/engine commands. A malformed invocation of this recognized session/color grammar, including a missing, invalid, or repeated color, SHALL fail before interactive rendering with focused guidance and nonzero status. This addition SHALL NOT expose CLI picker/continue aliases, a `resume` subcommand, a `solo` word, or session/color arguments on the Pi comparison launch.

For a declared normal launch, the first `--` SHALL end option parsing. An explicit boundary, with or without owned launch options, MAY carry literal prompt arguments after it. A1 SHALL retain post-boundary token text/order, SHALL NOT consume color-looking prompt tokens as options, and SHALL pass nonempty prompt content once to the existing owned prompt path after successful session startup and first presentation. Literal payload SHALL NOT be shell-evaluated or used as arbitrary Pi argument passthrough. Grammar/session startup failure or trust exit SHALL NOT submit it. Unsupported leading words outside this narrowly declared launch form SHALL remain unsupported.

An unsupported command or operation SHALL exit successfully without output before any runtime, shell, or operation startup. A malformed invocation of a recognized maintenance command SHALL fail before startup with focused command guidance and without automatically printing the complete help.

#### Scenario: Query help
- **WHEN** the user runs `a1 --help` or `a1 -h`
- **THEN** A1 SHALL print help including supported normal session/color launch forms and the literal boundary without launching any profile

#### Scenario: Query version
- **WHEN** the user runs `a1 --version` or `a1 -v`
- **THEN** A1 SHALL execute the dependency-light version query without launching any profile

#### Scenario: Manage packages
- **WHEN** the user runs `a1 pi install`, `a1 pi remove`, `a1 pi uninstall`, `a1 pi list`, or an accepted package update form
- **THEN** A1 SHALL run the package operation against the A1 profile without launching any interactive profile

#### Scenario: Launch form is given an argument
- **WHEN** an interactive launch form is followed by an argument outside the declared maintenance and normal session/color/literal-boundary grammars
- **THEN** A1 SHALL return successfully and silently without launching a profile unless it is a malformed invocation of a recognized launch grammar

#### Scenario: Unknown subcommand
- **WHEN** the user provides a word outside the declared grammar
- **THEN** A1 SHALL return successfully and silently without invoking a shell or child process

#### Scenario: Comparison launch is absent from a release
- **WHEN** the user runs bare `a1 pi` from a stable release build
- **THEN** A1 SHALL return successfully and silently without launching a profile

#### Scenario: Removed update command is provided
- **WHEN** the user provides a command beginning `update:`
- **THEN** A1 SHALL return successfully and silently without update or runtime work

#### Scenario: Resume from either release channel
- **WHEN** the user runs a valid normal A1 `--session` launch from a stable or prerelease build
- **THEN** A1 SHALL launch the selected session under the normal A1 profile and shared owned runtime

#### Scenario: Session arguments are supplied to the comparison
- **WHEN** the user runs `a1 pi --session <id>`
- **THEN** that unsupported comparison operation SHALL remain a silent no-op rather than fall through to a normal A1 session launch

#### Scenario: Launch with an invocation color
- **WHEN** the user runs `a1 --session-color green` or combines that color with valid normal session selection in either order
- **THEN** A1 SHALL launch only the normal profile with the validated invocation-only color
- **AND** the owned color option SHALL NOT reach Pi as an unknown option

#### Scenario: Reject malformed color before rendering
- **WHEN** a recognized normal launch contains `--session-color` with no value, an unsupported value, or a repeated occurrence before the boundary
- **THEN** A1 SHALL exit nonzero with focused guidance before interactive startup, project-trust presentation, or editor rendering

#### Scenario: Preserve a color-looking literal prompt
- **WHEN** the user runs `a1 --session-color green -- --session-color pink`
- **THEN** A1 SHALL start with green and treat the post-boundary text as literal prompt content, not another override
- **AND** that content SHALL be submitted once only after successful session startup and first presentation without shell evaluation

#### Scenario: Boundary launch without override
- **WHEN** the user starts a normal launch with an explicit `--` and literal prompt but no invocation color
- **THEN** ordinary saved-Default initialization SHALL remain in effect
- **AND** color-looking post-boundary tokens SHALL not become launch options

#### Scenario: Leave unrelated commands alone
- **WHEN** a startup-color option is supplied as an unsupported comparison or noninteractive operation
- **THEN** it SHALL NOT enable a normal interactive launch or color override
- **AND** installer/update progress SHALL remain unchanged

## ADDED Requirements

### Requirement: Invocation color survives owned startup boundaries without persistence or environment inheritance

Supported bare-A1 startup SHALL carry its validated optional invocation color through existing launch intent, bootstrap/child/reselection/development, and composition contracts before visible interactive presentation. It SHALL initialize only that runtime, SHALL NOT write profile/project settings, and SHALL NOT introduce a persistent or inheritable color environment variable visible to agent tools or the eventual shell. A selected retained UI that cannot support the owned startup payload SHALL be rejected for an explicit override before interactive rendering rather than receive an unknown option or silently lose the color. No-override ordinary release fallback and comparison behavior SHALL remain unchanged.

#### Scenario: Cold or warm launch with override
- **WHEN** a supported normal launch materializes a release or reuses/reselects a supported retained release with an invocation color
- **THEN** its child SHALL receive and consume the same validated value before its first owned interactive frame
- **AND** no bootstrap boundary SHALL persist or silently drop it

#### Scenario: Retained UI cannot consume the payload
- **WHEN** an explicit invocation override would launch an incompatible retained UI
- **THEN** A1 SHALL fail the unsupported override before rendering without forwarding an unknown option or reporting a successful Default-colored override
- **AND** ordinary no-override launching SHALL retain its existing fallback behavior

#### Scenario: Tools and parent shell remain unaffected
- **WHEN** an overridden runtime starts agent tools or exits back to the shell
- **THEN** neither SHALL inherit a launch-color environment variable or durable settings mutation from that invocation
- **AND** peer runtimes and comparison presentation SHALL remain unchanged
