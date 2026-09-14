## ADDED Requirements

### Requirement: Interrupted update preserves the public command
After an update accepts cancellation or loses its invoking updater or terminal process, A1 SHALL automatically leave or restore the complete platform launcher set needed to invoke `a1`. The recovered command SHALL execute either the prior verified immutable release or the completely installed target and SHALL retain the durable update transaction needed to continue or roll back. Recovery SHALL require no manual npm installation, launcher reconstruction, process termination, or A1 state deletion.

#### Scenario: User cancels during global package replacement
- **WHEN** the user interrupts `a1 update` while the package manager has removed or renamed a public launcher
- **THEN** A1 SHALL coordinate cancellation and SHALL NOT return an acknowledged cancellation to the shell until the complete platform launcher set is callable

#### Scenario: Invoking updater or terminal exits
- **WHEN** the invoking updater or its terminal process exits during global package replacement
- **THEN** an independently surviving recovery owner SHALL complete a safe package boundary or restore a verified recovery launcher without user intervention

#### Scenario: User invokes a restored recovery launcher
- **WHEN** package replacement did not leave a complete installed target and the user next invokes `a1`
- **THEN** the launcher SHALL use verified recovery evidence to run the prior immutable release or continue the recorded transaction to one verified active or rollback cohort

#### Scenario: Recovery authority is invalid
- **WHEN** launcher recovery evidence names an unexpected path, package, transaction, release identity, or changed launcher payload
- **THEN** A1 SHALL reject that evidence and SHALL NOT execute or install content from it
