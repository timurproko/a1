# session-worktree-recovery Specification

## Purpose
TBD - created by archiving change worktree-link-self-recovery. Update Purpose after archive.

## Requirements

### Requirement: Mutation authority survives metadata damage without permanent poisoning

The recovery-capable session worktree mutation protocol SHALL use process-lifetime exclusion independent of parseable lock metadata. It SHALL serialize all participating mutation and recovery operations, release authority on holder termination, and keep acquisition bounded and abortable. A malformed diagnostic record SHALL NOT permanently block subsequent mutations once authoritative exclusion and compatibility checks establish safe recovery. Recovery SHALL preserve durable runtime records, associations, worktree claims, Git state, and cleanup authority.

#### Scenario: Upgraded holder crashes during lock publication

- **GIVEN** a recovery-capable process terminates while publishing mutation metadata
- **WHEN** another process acquires authoritative exclusion and passes compatibility checks
- **THEN** it SHALL recover the abandoned artifact and perform the requested mutation without manual file deletion
- **AND** it SHALL preserve unrelated claims and associations

#### Scenario: Metadata contains 155 NUL bytes

- **GIVEN** the recovery-capable protocol's mutation metadata is replaced with 155 NUL bytes and no holder retains authority
- **WHEN** the next mutation safely establishes exclusive authority
- **THEN** it SHALL recover the corrupt artifact and proceed
- **AND** it SHALL retain only bounded private recovery information, without session content or credentials

#### Scenario: Multiple recoverers race

- **WHEN** two processes attempt recovery and mutation concurrently
- **THEN** at most one SHALL hold mutation authority at a time
- **AND** neither SHALL remove, rename, or overwrite a successor's live authority
- **AND** competing links to one worktree SHALL retain the ordinary single-owner result

#### Scenario: Native exclusion cannot be established

- **WHEN** native coordination is unavailable or a filesystem boundary or access failure prevents authoritative exclusion
- **THEN** mutation SHALL fail with a classified bounded error
- **AND** SHALL NOT substitute an unsafe time-based lease or poisonable JSON-only fallback

### Requirement: Legacy recovery does not bypass unverifiable ownership

Recovery SHALL honor writers using the legacy mutation protocol. Valid legacy records SHALL require exact process-identity absence before eviction. Malformed legacy records SHALL be automatically migrated only after legacy-writer exclusion is independently established. Age, stable bytes, an absent runtime record, or acquisition of a gate unknown to legacy writers SHALL NOT constitute that proof. If proof is unavailable, recovery SHALL retain the artifact and provide a specific safe recovery diagnostic.

#### Scenario: A legacy holder is live or cannot be inspected

- **WHEN** an upgraded mutation encounters a live or uninspectable legacy holder
- **THEN** it SHALL preserve the legacy gate and return a bounded classified failure
- **AND** SHALL NOT allow simultaneous old and upgraded writers

#### Scenario: A valid legacy holder is proven dead

- **WHEN** exact process-identity inspection proves the recorded legacy owner absent
- **THEN** recovery MAY retire that exact unchanged legacy artifact under coordinated replacement protection
- **AND** the requested mutation SHALL still perform ordinary runtime and claim validation

#### Scenario: Corrupt legacy ownership is ambiguous

- **GIVEN** a malformed legacy lock whose possible writers cannot be excluded
- **WHEN** a session requests a mutation
- **THEN** it SHALL receive a legacy-recovery-required explanation and safe next steps rather than a generic indefinite busy response
- **AND** no lock, claim, association, or worktree SHALL be deleted or adopted

### Requirement: Runtime registration retries after transient startup failure

The runtime registry SHALL schedule lifecycle-owned bounded retries independently of first activation success. Transient process-inspection failure SHALL NOT permanently cache an unavailable owner. Retries SHALL be serialized and coalesced, publish only the current agent/session generation, preserve sibling claims, and stop on disposal. Successful recovery SHALL allow a subsequent explicit worktree link in the same running session without restarting it.

#### Scenario: Initial activation is blocked then the mutation gate recovers

- **WHEN** initial runtime activation fails because mutation authority is temporarily unavailable
- **AND** authority later becomes available
- **THEN** a scheduled retry SHALL publish the current runtime registration
- **AND** an explicit link SHALL proceed through normal ownership checks without restarting the session

#### Scenario: Initial owner inspection fails temporarily

- **WHEN** the first native self-inspection fails and a later inspection succeeds
- **THEN** the registry SHALL use the verified identity for a later registration attempt
- **AND** SHALL NOT permanently cache the initial failure

#### Scenario: Slow retries overlap a session switch or disposal

- **WHEN** registration remains slow while refresh intervals elapse and the agent switches sessions or the runtime disposes
- **THEN** retry work SHALL NOT accumulate without bound
- **AND** obsolete identities SHALL NOT be republished after replacement
- **AND** no registration SHALL be published after disposal completes

### Requirement: Recovery failures are actionable without changing inventory authority

Session-context diagnostics SHALL distinguish actual worktree ownership conflict from temporary mutation contention, damaged legacy state, unavailable inspection/native support, and I/O failure. They SHALL explain whether retry or safe operator action is appropriate without exposing another session's identity or content. Inventory SHALL remain read-only; neither inventory nor recovery SHALL grant editing, cleanup, or Git mutation authority beyond the existing explicit link protocol.

#### Scenario: Corrupt state is not reported as an active worktree owner

- **WHEN** malformed legacy mutation metadata prevents linking
- **THEN** the diagnostic SHALL identify the recovery limitation rather than claiming another agent owns the selected worktree
- **AND** SHALL NOT recommend deleting the session/claim store

#### Scenario: Inventory observes damaged coordination state

- **WHEN** a session inventories worktrees while recovery is pending
- **THEN** it SHALL report conservative status without repairing or deleting state
- **AND** SHALL NOT expose process identity, session file, prompt, transcript, or credentials

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

### Requirement: Product commands own worktree entry and attachment

A1 SHALL expose `worktree enter`, `attach`, `detach`, and `list`. Enter SHALL create or resume a matching registered task worktree and acquire its editing claim. Successful enter/attach SHALL return the exact canonical root and branch without requiring a second inventory verification. Existing session-context commands SHALL remain compatible. Detach SHALL preserve all worktree files and branches. Creation SHALL support configured or explicit repository bases without assuming all repositories use the same branch name.

#### Scenario: Create and resume a task

- **WHEN** an active session enters a new valid task branch
- **THEN** A1 SHALL create its isolated worktree from the selected current base and attach it
- **AND** repeating entry SHALL preserve matching existing uncommitted work

#### Scenario: A selected checkout cannot be acquired

- **WHEN** the selected path is foreign, primary, locked, mismatched, or owned by another live runtime
- **THEN** the operation SHALL retain existing files and the previous attachment and return a bounded actionable failure
- **AND** SHALL NOT force creation, overwrite a branch, or remove a worktree

### Requirement: Ordinary coordination is internal to the operation

A1 SHALL handle transient coordination and startup-registration contention with bounded internal retries. Informational inventory SHALL use a consistent snapshot rather than misclassifying all worktree owners when unrelated global coordination is temporarily occupied. Genuine unverifiable ownership SHALL remain distinct and protected. Repository guidance SHALL NOT require agents to interpret internal lock state or run a separate inventory approval gate after successful attachment.

#### Scenario: Inventory overlaps another session's ordinary mutation

- **WHEN** an inventory overlaps a bounded coordination mutation
- **THEN** it SHALL wait within its operation budget for a consistent snapshot or report temporary operation contention
- **AND** SHALL NOT represent unrelated worktree ownership as corrupt or unverifiable solely because of that contention

### Requirement: Stable attachments do not require repeated activation

A1 SHALL activate persisted attachment state for each session binding and retry transient initial failures. Subsequent background polls SHALL observe the verified attachment without rewriting an unchanged runtime registration or editing claim. Built-in tools SHALL resolve their relative working directory from the current verified attachment at invocation time; detach SHALL restore the startup directory. An uncertain association SHALL NOT silently redirect writes to the primary checkout.

#### Scenario: Background polls of an attached session

- **WHEN** the same session is polled repeatedly
- **THEN** ordinary polls SHALL NOT reacquire or rewrite its editing claim
- **AND** attachment changes SHALL remain observable

#### Scenario: Tool after an attachment command

- **WHEN** attachment or detach completes and a subsequent built-in tool runs
- **THEN** its relative paths SHALL use the resulting verified working directory
- **AND** explicit absolute paths SHALL retain their ordinary meaning
