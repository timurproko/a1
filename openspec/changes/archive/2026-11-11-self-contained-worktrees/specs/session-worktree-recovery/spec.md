## ADDED Requirements

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
