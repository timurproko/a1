## MODIFIED Requirements

### Requirement: Maintenance commands remain unambiguous

Ordinary A1 SHALL retain its control namespaces and their handlers: `update`, `install`, `remove`, `uninstall`, `list`, `worktree`, `session`, `api`, `help`, `version`, and the `pi` comparison routing. A leading recognized control word SHALL remain a command; a malformed recognized control SHALL fail with status 2 and SHALL never become a prompt. Both normal-product names SHALL accept Pi-style positional prompts and `--` to end option parsing. After the boundary all words are input rather than maintenance. The reserved words `agent`, `solo`, `ui`, `tabs`, and any `update:<selector>` SHALL fail with status 2 instead of guessing work, and `config`, `auth`, and `mcp` SHALL fail with status 2 and a diagnostic saying the command is not available.

Public normal-product launch options SHALL use one parser for `--model`, `--provider`, `--thinking`, repeatable `-e`/`--extension`, `-xt`/`--exclude-tools`, the session selectors, `--session-dir`, `--session-color`, `--models`, `--api-key`, `-a`/`--approve`, `-na`/`--no-approve`, and `--list-models`. An unknown long flag SHALL be passed as an extension flag value that requires a loaded extension registration. An unknown short flag, a missing, repeated, or `=`-joined value for a value option, and the internal `--runtime-options` SHALL fail with status 2. The Pi options A1 does not implement (`--mode`, `--print`, `--export`, `--tools`, `--no-tools`, `--no-builtin-tools`, `--no-extensions`, `--no-mcp`, `--skill`, `--no-skills`, `--prompt-template`, `--no-prompt-templates`, `--theme`, `--use-theme`, `--no-themes`, `--no-context-files`, `--system-prompt`, `--append-system-prompt`, `--tui-mode`, `--verbose`, `--offline`, their short forms, and `@file` inputs) SHALL fail with status 2 and a diagnostic saying the option is not available, and SHALL NOT be accepted and ignored or treated as prompt text.

Invocation color SHALL be exactly blue, green, orange, pink, purple, cyan or grey, singleton and nonpersistent. Instructions SHALL keep their order, SHALL NOT be shell-evaluated, and SHALL reach the normal owned prompt path once after successful startup. Interactive initial submission SHALL wait for extension startup and first presentation. Literal instructions SHALL be NUL-free and at most 32768 UTF-8 bytes; larger input SHALL fail explicitly and SHALL never be truncated.

#### Scenario: Query help
- **WHEN** standalone help is requested
- **THEN** the implemented options, the `--` prompt boundary, and the instruction size limit SHALL be printed without session, factory, or model startup

#### Scenario: Query version
- **WHEN** standalone version is requested
- **THEN** product version information SHALL be returned without interactive startup

#### Scenario: Manage packages
- **WHEN** a supported package spelling is supplied
- **THEN** its handler SHALL run instead of prompting

#### Scenario: Launch form is given an argument
- **WHEN** a supported execution invocation carries positional instructions
- **THEN** they SHALL remain ordered input without switching into maintenance

#### Scenario: Unknown subcommand
- **WHEN** an unrecognized operation follows a recognized control namespace
- **THEN** it SHALL not become a model prompt; outside command namespaces, an unreserved bare word SHALL be a positional prompt

#### Scenario: Comparison launch is absent from a release
- **WHEN** a stable build receives bare `a1 pi`
- **THEN** A1 SHALL exit 0 silently and SHALL NOT select normal-product execution

#### Scenario: Removed update command is provided
- **WHEN** an `update:<selector>` form is supplied
- **THEN** A1 SHALL exit with status 2 and no update or model work SHALL execute

#### Scenario: Resume from either release channel
- **WHEN** either channel receives a supported normal session selection
- **THEN** it SHALL use the shared normal profile and writer guard

#### Scenario: Session arguments are supplied to the comparison
- **WHEN** session arguments follow `a1 pi`
- **THEN** they SHALL not fall through to a normal launch

#### Scenario: Launch with an invocation color
- **WHEN** valid invocation color combines with supported options
- **THEN** normal A1 SHALL receive that nonpersistent color without Pi option passthrough

#### Scenario: Reject malformed color before rendering
- **WHEN** color is invalid, missing or repeated
- **THEN** launch SHALL fail before rendering

#### Scenario: Preserve a color-looking literal prompt
- **WHEN** a green invocation override precedes the boundary and color-looking prompt tokens follow it
- **THEN** green SHALL remain the override and the later tokens SHALL be literal instructions submitted once after startup

#### Scenario: Boundary launch without override
- **WHEN** a prompt has no invocation color
- **THEN** saved Default initialization SHALL remain in effect

#### Scenario: Leave unrelated commands alone
- **WHEN** an invalid launch option is supplied to a control/comparison operation
- **THEN** it SHALL not activate normal interactive behavior or alter maintenance presentation

#### Scenario: An unimplemented Pi option is supplied
- **WHEN** the user runs `a1 --print hello` or `a1 @notes.md`
- **THEN** A1 SHALL exit with status 2 after a diagnostic naming the unavailable option or input and SHALL launch nothing

### Requirement: A1 exposes one single-agent launch and one prerelease comparison launch
The `a1` binary SHALL remain the ordinary installed public command. Bare invocation SHALL launch the A1 single-agent product surface directly. A prerelease build SHALL additionally expose `a1 pi` as a development comparison against the pinned Pi interface. A release build SHALL not expose the comparison launch. A1 SHALL additionally ship a separately named Pi-compatible normal-product entry and an opt-in pi shim directory, but SHALL NOT globally register pi and SHALL reject the `agent`, `solo`, `ui`, and `tabs` words with status 2.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL launch the owned single-agent UI using the normal A1 profile

#### Scenario: Launch the Pi comparison
- **WHEN** the user runs `a1 pi` from a prerelease build
- **THEN** A1 SHALL launch the shared owned rendering pipeline with A1-specific surfaces withheld and Pi's ordinary user profile selected

#### Scenario: A removed launch word is given
- **WHEN** the user runs `a1 solo` or `a1 tabs`
- **THEN** A1 SHALL exit with status 2 after one stderr diagnostic without launching a profile

#### Scenario: Compatibility launch preserves the product
- **WHEN** Firstmate resolves the opt-in A1-compatible pi executable
- **THEN** it SHALL launch normal A1 rather than the Pi comparison and retain normal A1 settings, history and features
