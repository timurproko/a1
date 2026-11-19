## ADDED Requirements

### Requirement: Runtime shutdown releases the runtime's editing claims
When a claim-owning runtime is disposed, A1 SHALL release every editing claim held by that exact runtime generation and remove its runtime record, under the mutation gate, without requiring a detach. It SHALL act only when a runtime record matches both the runtime identifier and the recorded process identity, and SHALL leave other runtimes' claims, worktree files, and branches unchanged.

#### Scenario: A session exits while attached
- **WHEN** a runtime that holds an editing claim shuts down
- **THEN** its claims and runtime record SHALL be removed
- **AND** the worktree's files and branch SHALL remain

#### Scenario: The process identity does not match
- **WHEN** no runtime record matches the disposing runtime's identifier and process identity
- **THEN** no claim SHALL be released

## MODIFIED Requirements

### Requirement: Ordinary coordination is internal to the operation

A1 SHALL handle transient coordination and startup-registration contention with bounded internal retries. Informational inventory SHALL use a consistent snapshot rather than misclassifying all worktree owners when unrelated global coordination is temporarily occupied. Genuine unverifiable ownership SHALL remain distinct and protected.

#### Scenario: Inventory overlaps another session's ordinary mutation

- **WHEN** an inventory overlaps a bounded coordination mutation
- **THEN** it SHALL wait within its operation budget for a consistent snapshot or report temporary operation contention
- **AND** SHALL NOT represent unrelated worktree ownership as corrupt or unverifiable solely because of that contention

## REMOVED Requirements

### Requirement: Implementation handoff preserves task attachment
**Reason**: It prescribes the text of the repository's agent instruction file, which is now a fixed shared template. Its one product rule is kept.
**Migration**: See "Runtime shutdown releases the runtime's editing claims". Detach and completion behaviour stay in the other requirements of this capability.
