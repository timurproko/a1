## ADDED Requirements

### Requirement: Production composition supplies runtime process inspection by default

Bare A1 composition SHALL supply the supported production process inspector to its session runtime registry whenever the caller does not inject one, so the normal launch path registers its runtime and arms registration retries. An explicitly injected inspector SHALL take precedence. The comparison profile SHALL remain unregistered. Supplying the default SHALL NOT weaken ownership verification, process-identity checks, or legacy-record handling, and successful registration alone SHALL NOT authorize worktree takeover or cleanup.

#### Scenario: Launch through the normal entrypoint

- **WHEN** bare A1 composes its UI the way the production entrypoint does, with a session runtime ID and no injected process inspector
- **THEN** the primary session's repository context reader SHALL publish a runtime record for the current process and session
- **AND** registration retries SHALL be armed independently of the first attempt's outcome

#### Scenario: A caller injects a process inspector

- **WHEN** a test or SDK caller supplies its own process inspector
- **THEN** composition SHALL use that inspector instead of the production default

#### Scenario: Run the comparison profile

- **WHEN** the comparison profile composes its UI
- **THEN** it SHALL NOT publish a runtime record, acquire worktree claims, or release another runtime's claims

#### Scenario: Another runtime owns the worktree

- **WHEN** a newly registered runtime attempts to link a worktree held by another live or unverifiable runtime
- **THEN** the link SHALL remain blocked by the existing ownership checks
