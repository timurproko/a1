## Purpose

Defines the deeply integrated Pi engine mode that powers AddOne's custom conversation UX through documented process APIs while preserving sessions, extensions, and controlled runtime upgrades.

## ADDED Requirements

### Requirement: Managed Pi uses a documented semantic process boundary
AddOne SHALL run Managed Pi through a documented Pi RPC or equivalent public adapter boundary and SHALL not require private Pi TUI hooks, prototype patches, package-file hashes, or internal distribution imports.

#### Scenario: Start a Managed Pi agent
- **WHEN** the supervisor starts a Managed Pi logical agent
- **THEN** it SHALL establish the public process protocol, obtain the current state, and publish readiness without starting Pi's interactive TUI

#### Scenario: Pi private TUI changes
- **WHEN** a candidate Pi version changes private interactive TUI implementation details but retains the supported managed protocol
- **THEN** the Managed Pi adapter SHALL require no host-profile migration for those private details

### Requirement: Pi events are normalized for AddOne
The Managed Pi driver SHALL map accepted prompts, message streaming, tool execution, queues, retries, compaction, session changes, model state, and settled state into stable AddOne events with preserved correlation identities.

#### Scenario: Structured tool execution
- **WHEN** Pi reports a tool start, updates, and completion
- **THEN** AddOne SHALL present one correlated tool execution with its arguments, progress, result, and error state

#### Scenario: Full run settles
- **WHEN** Pi has no remaining retry, compaction retry, steering message, or follow-up continuation
- **THEN** the driver SHALL report the logical agent as settled

### Requirement: Managed prompts have explicit delivery semantics
AddOne SHALL distinguish immediate prompts, steering messages, and follow-up messages and SHALL reject delivery modes that are invalid for the current Pi state.

#### Scenario: Prompt while idle
- **WHEN** the user submits a prompt while the Managed Pi agent is idle
- **THEN** the driver SHALL send it as a new accepted prompt and track its acceptance separately from final completion

#### Scenario: Prompt while streaming
- **WHEN** the user submits input while Pi is streaming
- **THEN** AddOne SHALL require or apply an explicit steering or follow-up choice rather than ambiguously submitting an immediate prompt

### Requirement: Managed Pi resumes exact durable sessions
The driver SHALL persist Pi session ID, absolute session file, and durable entry cursor and SHALL verify them when replacing or recovering a worker.

#### Scenario: Successful recovery
- **WHEN** a replacement Pi worker opens the expected session file and reports the expected session ID
- **THEN** the driver SHALL reconcile entries after the last durable cursor and mark the agent ready

#### Scenario: Session identity mismatch
- **WHEN** a replacement worker reports a different session ID for the expected session file
- **THEN** the driver SHALL fail recovery safely and SHALL not silently continue in a fresh conversation

#### Scenario: Missing session file
- **WHEN** the recorded Pi session file is missing or unreadable
- **THEN** AddOne SHALL report that exact-session recovery is unavailable and require an explicit fresh or import/fork decision

### Requirement: Pi runtimes are exactly pinned and installed side by side
Each Managed Pi generation SHALL reference an AddOne-controlled immutable runtime version, and installing a candidate version SHALL not replace binaries used by active agents.

#### Scenario: Install candidate Pi version
- **WHEN** a newer Pi version is downloaded
- **THEN** existing agents SHALL continue using their recorded runtime until an explicit migration succeeds

#### Scenario: Candidate fails certification
- **WHEN** the candidate runtime fails compatibility or recovery tests
- **THEN** AddOne SHALL leave the currently approved runtime active and retain the candidate diagnostics

### Requirement: Runtime migration uses process replacement
Managed Pi code or extension updates SHALL use idle drain, session verification, process replacement, and readiness verification rather than whole-system in-process reload fanout.

#### Scenario: Migrate an idle agent
- **WHEN** the user or policy migrates an idle agent to an approved runtime
- **THEN** AddOne SHALL stop the old writer, start the approved replacement with the exact session, verify continuity, and then commit the new generation

#### Scenario: Replacement fails
- **WHEN** the replacement cannot open or validate the expected session
- **THEN** AddOne SHALL retain a recoverable error state and allow rollback to the previous installed runtime without claiming migration success

### Requirement: Managed Pi loads versioned resource profiles
A Managed Pi agent SHALL use a recorded profile of extensions, skills, prompts, themes where applicable, settings, and trust policy, and profile changes SHALL create a new revision rather than silently mutating every live worker.

#### Scenario: Install an extension
- **WHEN** the user adds a Pi extension to a profile
- **THEN** AddOne SHALL create or update a profile revision and SHALL not inject it into unrelated live agent generations automatically

#### Scenario: Broken extension profile
- **WHEN** a worker fails during profile startup
- **THEN** AddOne SHALL identify the profile and extension diagnostics and offer a safe retry or safe-mode path without modifying the conversation session

### Requirement: Portable Pi extension behavior is represented in AddOne
Managed mode SHALL support Pi extensions that use engine events, tools, commands, providers, messages, and the portable RPC extension UI operations exposed by the selected Pi runtime.

#### Scenario: Extension requests confirmation
- **WHEN** an extension issues a portable confirmation request
- **THEN** AddOne SHALL render an AddOne-owned confirmation dialog and return the user's response through the extension protocol

#### Scenario: Extension registers a tool
- **WHEN** a loaded extension registers a tool available to the selected Pi session
- **THEN** the tool SHALL remain callable by Pi and its execution SHALL appear in the normalized tool event stream

### Requirement: Native-TUI extension limitations are explicit
AddOne SHALL not claim Managed compatibility for extension behavior that requires Pi's interactive TUI, and SHALL identify Native Pi mode as the compatibility path when available.

#### Scenario: Extension requires custom Pi TUI
- **WHEN** an extension requires unsupported native custom components, editor replacement, direct terminal input, or private Pi behavior
- **THEN** AddOne SHALL mark that behavior as native-only or unsupported instead of silently presenting it as functional in Managed mode

### Requirement: Managed Pi does not depend on the global Pi installation
AddOne SHALL resolve Managed Pi executables, package resources, sessions, and profiles from AddOne-controlled paths.

#### Scenario: Global Pi updates
- **WHEN** the user updates a separately installed global Pi command
- **THEN** active and approved Managed Pi runtimes SHALL remain unchanged
