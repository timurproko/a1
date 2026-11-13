# Launch Profiles Specification

## Purpose

Defines the A1 command grammar and the separate profile roots used by normal A1 and the prerelease Pi comparison.

## Requirements

### Requirement: Launch profiles use separate user roots
The normal A1 profile SHALL use `<home>/.a1/agent`, including one global `settings.json` containing Pi-owned root settings and an A1-owned namespaced section. The Pi comparison SHALL leave Pi's configuration-root override unset so Pi preserves its ordinary `<home>/.pi/agent` behavior and SHALL NOT consume the A1-owned section. Path resolution SHALL use the effective user home consistently, remain independent of installed package and materialized release roots, and remain overrideable in hermetic tests.

#### Scenario: Bare A1 resolves its profile
- **WHEN** A1 launches with user home `H`
- **THEN** the pinned Pi engine and A1-owned settings manager SHALL use `H/.a1/agent/settings.json`
- **AND** each SHALL read only its owned portion of that document

#### Scenario: Pi comparison resolves its profile
- **WHEN** the comparison launches with user home `H`
- **THEN** A1 SHALL leave the configuration-root override unset so Pi resolves `H/.pi/agent`
- **AND** it SHALL NOT read or apply the product namespace from `H/.a1/agent/settings.json`

#### Scenario: Launch another installed version
- **WHEN** another A1 version or replacement installation launches under the same effective user home
- **THEN** it SHALL resolve the same normal-profile `settings.json`
- **AND** that file SHALL NOT be selected from the package or materialized release directory

### Requirement: Profile selection isolates settings and resources
Normal A1 and the Pi comparison SHALL resolve settings, authentication, sessions, extensions, skills, prompts, themes, packages, trust state, and other Pi-owned profile data only from the selected profile root, except for supported environment credentials. A1 SHALL NOT merge profile directories or silently fall back from its profile to Pi's profile.

#### Scenario: Normal A1 settings exist
- **WHEN** `<home>/.a1/agent/settings.json` differs from `<home>/.pi/agent/settings.json`
- **THEN** bare `a1` SHALL use the A1 settings and `a1 pi` SHALL use the ordinary Pi settings

#### Scenario: A1 lacks credentials
- **WHEN** the A1 profile has no authentication state and no supported provider credential is available
- **THEN** the engine SHALL present its normal authentication flow without copying credentials from Pi's profile

### Requirement: A1 never mutates another launch profile implicitly
A1 MAY create its `.a1/agent` profile root and required empty directories when absent, but SHALL NOT copy, link, merge, rewrite, or delete files from `.pi/agent` or an existing profile unless the user invokes an explicit management operation.

#### Scenario: First A1 launch
- **WHEN** `<home>/.a1/agent` does not exist
- **THEN** A1 SHALL create only the minimum profile structure and leave `<home>/.pi/agent` unchanged

### Requirement: Both launch forms use one rendering pipeline
Normal A1 and the Pi comparison SHALL use the A1-owned rendering and input pipeline. Profile selection SHALL change configuration and product-surface availability, not introduce a PTY, terminal parser, byte relay, child terminal renderer, resident host, or native addon.

#### Scenario: Compare terminal paths
- **WHEN** either launch form starts
- **THEN** it SHALL use the same owned runtime composition inside the same single-process launch boundary

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

### Requirement: Interactive launch forms are concurrently independent
A1 SHALL permit multiple simultaneous instances of bare `a1`, prerelease `a1 pi`, or both. Profile selection, profile data, and process lifetime SHALL remain scoped to the originating invocation rather than a product-wide foreground slot. A1-owned runtimes in either profile SHALL share the session-writer admission guard only when selecting the same canonical session file. The guard SHALL be implemented in Node without native code and SHALL start no host, holder, strip, or bridge. Different session files SHALL remain independently writable, and unmodified external Pi or older nonparticipating builds SHALL NOT be claimed as covered.

#### Scenario: Start the same profile twice
- **WHEN** the user starts two instances of the same profile
- **THEN** both SHALL launch independently without sharing foreground ownership or contacting each other

#### Scenario: Start both profile forms
- **WHEN** owned A1 or Pi-comparison instances are already active and another supported form is launched
- **THEN** the new invocation SHALL start independently without requiring an existing instance to exit

#### Scenario: Comparison profile selects a session held by another A1 writer
- **WHEN** a Pi-comparison runtime selects the canonical file already held by a direct A1 runtime
- **THEN** the shared writer guard SHALL reject duplicate writing with the existing safe conflict behavior

#### Scenario: Different session files across profiles
- **WHEN** bare-A1 and Pi-comparison runtimes select distinct unheld session files
- **THEN** both SHALL proceed concurrently without a product-wide foreground lock

### Requirement: A1 exposes one single-agent launch and one prerelease comparison launch
The `a1` binary SHALL remain the ordinary installed public command. Bare invocation SHALL launch the A1 single-agent product surface directly. A prerelease build SHALL additionally expose `a1 pi` as a development comparison against the pinned Pi interface. A release build SHALL not expose the comparison launch. A1 MAY additionally ship a separately named Pi-compatible normal-product entry and an opt-in pi shim directory, but SHALL NOT globally register pi or expose `agent`, `solo`, `ui`, or `tabs` subcommands.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL launch the owned single-agent UI using the normal A1 profile

#### Scenario: Launch the Pi comparison
- **WHEN** the user runs `a1 pi` from a prerelease build
- **THEN** A1 SHALL launch the shared owned rendering pipeline with A1-specific surfaces withheld and Pi's ordinary user profile selected

#### Scenario: A removed launch word is given
- **WHEN** the user runs `a1 solo` or `a1 tabs`
- **THEN** A1 SHALL return quietly without launching a profile

#### Scenario: Compatibility launch preserves the product
- **WHEN** Firstmate resolves the opt-in A1-compatible pi executable
- **THEN** it SHALL launch normal A1 rather than the Pi comparison and retain normal A1 settings, history and features

### Requirement: Both launch forms are directly attached processes with one pipeline
Bare `a1` and prerelease `a1 pi` SHALL retain the shared A1-owned rendering and input pipeline declared by the canonical launch profile, differing only in configuration root and product-surface availability. Neither SHALL add process containment, supervision, or a resident capability around that pipeline.

#### Scenario: Compare profile paths
- **WHEN** the user launches bare `a1` alongside prerelease `a1 pi`
- **THEN** both SHALL use the shared owned pipeline as independent directly attached processes

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

### Requirement: Startup payload compatibility uses complete authenticated selected-release evidence

For an invocation color or literal prompt payload, bootstrap SHALL establish support from authenticated complete release evidence bound to the exact selected release before spawning that release's UI. A compact restart projection SHALL NOT be treated as a complete feature inventory: absence of the owned startup parser from its minimal executable entries SHALL NOT imply that the selected release lacks support. Conditional full-manifest loading SHALL retain existing release ID, version, content/contract digest, managed-root, manifest identity/immutability, and dependency evidence checks. Installed-package discovery or another release's capabilities SHALL NOT authorize the selected release. Unsupported or unverifiable selected releases SHALL fail closed without forwarding an unknown payload, silently dropping it, or retrying without it.

Support resolution SHALL apply independently to every ultimately selected release, including update-prior selection, retained fallback, active-selection races, and bounded reselection. Existing restart seals and their minimal executable-entry contract SHALL remain compatible. Ordinary launches without invocation color or literal prompt arguments SHALL add no support-only full-manifest read, recursive payload scan, or full rehash; their existing bounded restart validation and fallback policies SHALL remain unchanged.

#### Scenario: Compatible release launches cold and repeatedly warm
- **WHEN** the selected release's authenticated complete manifest supports the owned startup payload and launch uses full materialization or a compact restart projection containing only `bin/ui.js`
- **THEN** bootstrap SHALL accept the invocation color or literal prompt payload on the cold launch and repeated warm launches after certification
- **AND** the child SHALL receive the same literal arguments and apply invocation color before its first visible owned frame without settings writes

#### Scenario: Genuinely unsupported selected release
- **WHEN** the exact selected release's authenticated complete manifest lacks owned startup payload support
- **THEN** bootstrap SHALL reject invocation color and literal prompt arguments before spawning that UI
- **AND** ordinary no-payload launching SHALL retain its existing compatibility and fallback behavior

#### Scenario: Capability evidence belongs to a different release
- **WHEN** the installed package or another certified release supports startup payloads but the ultimately selected retained release does not
- **THEN** that other release's capabilities SHALL NOT authorize the selected release
- **AND** bootstrap SHALL fail the payload before spawning the unsupported UI

#### Scenario: Complete evidence cannot authenticate the selected identity
- **WHEN** required release, manifest, certification, managed-root, immutability, or dependency evidence is missing, changed, or mismatched and existing verification recovery cannot establish the exact approved release
- **THEN** bootstrap SHALL fail closed before spawning an unverifiable selected UI with the payload
- **AND** it SHALL NOT substitute filesystem existence or installed-version claims for authenticated support

#### Scenario: Update selection or reselection changes support
- **WHEN** update-prior selection, installation-failure fallback, active-selection races, or bounded reselection chooses a different release from an earlier supported candidate
- **THEN** bootstrap SHALL resolve startup support for that newly selected identity independently
- **AND** only a supported authenticated selected release SHALL receive the unchanged invocation payload

#### Scenario: Ordinary restart keeps its operation boundary
- **WHEN** an approved release launches with valid existing restart certification and no invocation color or literal prompt arguments
- **THEN** capability resolution SHALL add no full-manifest read, recursive discovery, or full content verification
- **AND** existing compact restart evidence operations SHALL remain independent of product payload size
