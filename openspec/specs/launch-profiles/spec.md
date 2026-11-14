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

Ordinary A1 SHALL retain existing control namespaces and their handlers, including update, packages, uninstall, worktree, session, help/version and comparison routing. A leading recognized control word SHALL remain a command; malformed recognized controls SHALL never become prompts. Both normal-product names SHALL accept Pi-style positional prompts and `--` to end option parsing. After execution-option parsing begins, control routing SHALL not resume; after the boundary all words are input rather than maintenance. Reserved removed launch/control forms SHALL fail explicitly instead of guessing work.

Public normal-product launch options SHALL use one authoritative implementation for model/provider/thinking, repeatable extensions, exclusions, guarded session selection/storage and invocation color, plus delivered session/model/trust additions. Unknown long flags SHALL require loaded extension registrations; unknown short flags, missing/duplicate/invalid options and internal `--runtime-options` SHALL fail clearly and nonzero. Documented contracts assigned to later approved deliveries SHALL fail explicitly rather than be accepted and ignored or silently treated as prompt text.

Invocation color SHALL remain exactly blue, green, orange, pink, purple, cyan or grey, singleton and nonpersistent. Instructions SHALL preserve the declared ordered-message semantics without shell evaluation and reach the existing normal owned prompt path once after successful startup. Interactive initial submission SHALL wait for extension startup and first presentation. P1 SHALL preserve bounded transport and report input limits explicitly pending the later input/large-payload transport, never truncate or claim full compatibility.

#### Scenario: Query help
- **WHEN** standalone help is requested
- **THEN** truthful delivered options, prompt boundaries and pending-delivery limits SHALL be printed without session/factory/model startup

#### Scenario: Query version
- **WHEN** standalone version is requested
- **THEN** truthful product/version information SHALL be returned without interactive startup

#### Scenario: Manage packages
- **WHEN** a currently supported package spelling is supplied
- **THEN** its existing handler SHALL run instead of prompting

#### Scenario: Launch form is given an argument
- **WHEN** a supported execution invocation carries positional instructions
- **THEN** they SHALL remain ordered input without switching into maintenance

#### Scenario: Unknown subcommand
- **WHEN** an unrecognized operation follows a recognized control namespace
- **THEN** it SHALL not become a model prompt; outside command namespaces, bare words SHALL have the approved Pi prompt semantics

#### Scenario: Comparison launch is absent from a release
- **WHEN** a stable build receives the unsupported bare comparison form
- **THEN** its existing comparison exclusion SHALL remain, never selecting normal-product execution

#### Scenario: Removed update command is provided
- **WHEN** a reserved removed update-colon form is supplied
- **THEN** no update or model work SHALL execute

#### Scenario: Resume from either release channel
- **WHEN** either channel receives a supported normal session selection
- **THEN** it SHALL use the shared normal profile and writer guard

#### Scenario: Session arguments are supplied to the comparison
- **WHEN** session arguments are unsupported by the comparison namespace
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

### Requirement: Shared default CLI preserves public and internal trust boundaries

Both public entries SHALL share delivered option normalization/help/catalog and concrete normal-product launch services, not duplicate a compatible runtime. Public input SHALL not inject internal child payloads. Original-cwd paths and explicit package source syntax SHALL remain intact. New invocation payloads SHALL survive supported development and immutable launch boundaries; the ultimately selected authenticated release SHALL support them or fail explicitly without option loss.

#### Scenario: Equivalent launches
- **WHEN** either entry receives equivalent delivered launch options/instructions
- **THEN** equivalent normal-product intents and runtime behavior SHALL result

#### Scenario: Safe catalog
- **WHEN** model listing is requested
- **THEN** the existing effective-profile implementation SHALL run without an interactive session/model call and preserve Firstmate pre-factory refusal

#### Scenario: Positional instruction and reserved word
- **WHEN** ordinary A1 receives a bare instruction or either entry receives update after the boundary
- **THEN** the input SHALL reach the normal prompt path, and the post-boundary update word SHALL not run maintenance
