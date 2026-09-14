## ADDED Requirements

### Requirement: Project trust options use canonical filesystem identities
The owned `/trust` surface SHALL derive project and parent trust-option labels, saved-selection identities, and persistence targets from the real filesystem identity of the resolved project directory, matching pinned Pi. It SHALL derive the parent from that canonical project identity, not by independently resolving the lexical parent. The displayed cwd heading SHALL retain the equivalent pinned session-cwd presentation rather than being rewritten merely to match trust-option identities. When real-path lookup fails, option construction SHALL fall back to the resolved project path as pinned Pi does, without granting trust or changing trust-store error handling.

#### Scenario: Open trust through a directory alias
- **WHEN** the session cwd names a symlink or directory junction whose resolved target differs from its lexical path
- **THEN** the project and parent options SHALL use the target's canonical identity for labels, saved-path matching, and updates
- **AND** the cwd heading SHALL retain the session-cwd presentation
- **AND** the parent option SHALL name the canonical target's parent even when the alias resides under a different parent

#### Scenario: Reopen a saved trust decision through an alias
- **WHEN** a saved trusted or untrusted decision applies to a project opened through an alias
- **THEN** the saved-decision text, inherited indication, selected option, and checkmark SHALL match pinned Pi for that same decision
- **AND** a direct canonical project decision SHALL NOT be presented as inherited merely because the session cwd uses an alias

#### Scenario: Trust the parent of an aliased project
- **WHEN** the user explicitly confirms the parent trust option
- **THEN** persistence SHALL trust the canonical target's parent and remove the canonical project's overriding decision
- **AND** it SHALL NOT instead trust the lexical alias's parent or alter unrelated trust entries
- **AND** the active session's trust state SHALL remain unchanged and the existing restart-required status SHALL be shown

#### Scenario: Save a project decision or cancel
- **WHEN** the user explicitly trusts or denies the project, or cancels the selector
- **THEN** trust or denial SHALL update only the canonical project's decision and preserve the existing restart-required behavior
- **AND** cancellation SHALL close the selector without changing persisted or active-session trust
- **AND** these interactions SHALL NOT load project-scoped resources or bypass startup trust preflight

#### Scenario: Open trust at a filesystem root
- **WHEN** the canonical project directory is a filesystem root
- **THEN** the selector SHALL omit the parent option and retain the project trust and denial options

#### Scenario: Canonicalization cannot resolve the project
- **WHEN** real-path lookup fails, including for a missing directory
- **THEN** option construction SHALL use the resolved project path and its lexical parent with the same root exclusion and option order as pinned Pi
- **AND** fallback SHALL NOT itself grant trust, suppress a separate trust-store failure, or migrate persisted decisions

### Requirement: Trust path parity retains independent styled-row evidence
For equivalent cwd inputs, filesystem alias topology, saved trust data, and current-session trust, the owned trust selector SHALL match independently captured pinned-Pi rows and action effects at 80 and 28 columns, dark/light themes, both existing output-padding variants, and truecolor/256-color. Evidence SHALL retain path spelling, semantic ANSI, selected/checkmarked state, and wrapping; canonical path differences SHALL NOT be masked by a new normalization or exception.

#### Scenario: Compare canonical and aliased trust paths
- **WHEN** independent producers render trust with ordinary and aliased cwd inputs, including native macOS temporary-directory aliases
- **THEN** complete styled rows SHALL match for open, saved/inherited, confirmed, and cancelled states
- **AND** confirmed persistence targets and cancellation's absence of writes SHALL match the pinned behavior

#### Scenario: Detect path or presentation regressions
- **WHEN** the owned capture substitutes a lexical parent for a distinct canonical parent, changes semantic ANSI, or changes wrapping
- **THEN** the parity gate SHALL fail rather than accepting the mutated result
