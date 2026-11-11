## ADDED Requirements

### Requirement: The installed release owns its post-activation work
After an updater delegates activation to the installed tree's activation entry, the updater SHALL NOT mutate release control state with its own code. The activation entry SHALL schedule release maintenance with the tree's own code after it commits the active reference. A maintenance failure SHALL be reported only as bounded diagnostics and SHALL NOT change the entry's `completed` verdict. An updater that activates an older tree in-process SHALL keep running maintenance itself. An updater SHALL ignore activation events it does not recognize, while malformed lines and malformed known events SHALL still fail the activation.

#### Scenario: A newer tree activates itself
- **WHEN** the updater delegates activation and the entry reports `completed`
- **THEN** the entry SHALL have scheduled maintenance with the new release's code
- **AND** the updater SHALL NOT run its own maintenance

#### Scenario: A newer tree reports an additional event
- **WHEN** the activation entry writes a well-formed event whose kind the updater does not know
- **THEN** the updater SHALL ignore it and continue relaying known events

### Requirement: A committed activation is never rolled back
Once the transaction journal records `active-reference-committed`, the update SHALL be complete. A later failure in post-activation work, delegated-entry exit, recovery-capsule removal, or maintenance SHALL finish the transaction as completed and report success with a bounded warning that cleanup will retry. It SHALL NOT attempt rollback. Interrupted-lease recovery SHALL settle a committed transaction the same way. When `a1 update` finds a settled transaction that reached the committed phase and its target is the active release, it SHALL take the up-to-date path instead of reinstalling.

#### Scenario: Post-activation work fails
- **WHEN** maintenance or the activation entry fails after the active reference was committed
- **THEN** the update SHALL report success with a warning and SHALL leave the new release active

#### Scenario: A failed committed update is retried
- **WHEN** a previous update failed after commit and its target is active
- **THEN** `a1 update` SHALL clear the journal and report that A1 is up to date without running npm

### Requirement: Release control state is compatible across releases
Release control state SHALL carry ordered compatibility levels: the lowest reader level that may read it and the lowest that may write it, with level 1 for state that carries none. Additive fields SHALL NOT raise either level, and code SHALL preserve fields it does not know when it writes. A level SHALL be raised only for a change older code would misinterpret. Writers SHALL never lower stored levels. Code below the read level SHALL refuse with an error identifying a newer release. Code below the write level SHALL read the state but refuse writes, and launch claims, cleanup scheduling, and cleanup workers SHALL skip their writes instead of failing. The family identifier SHALL remain stable so already-published releases that read it continue to do so.

#### Scenario: A newer release adds a field
- **WHEN** a newer release writes state with an additional field at the same levels
- **THEN** older releases SHALL read and update the state and SHALL preserve that field

#### Scenario: A newer release raises the write level
- **WHEN** state requires a write level above the running code's level
- **THEN** that code SHALL read it, SHALL skip housekeeping and launch claims, and SHALL NOT fail a launch or update

### Requirement: Release control-state writes are durable on Windows
A control-state write SHALL retry its atomic replacement for a bounded time when the platform reports a transient sharing failure. On final failure it SHALL remove its temporary file. Writers SHALL reclaim temporary state files left by writers that are no longer running and SHALL NOT touch a running writer's file.

#### Scenario: Another process reads the state during a write
- **WHEN** the atomic replacement is briefly refused because the target is open
- **THEN** the write SHALL succeed after retrying and SHALL leave no temporary file

### Requirement: Predecessor updaters settle state after candidate activation
Release validation SHALL show that each recent published predecessor that reads the current state family can delegate activation to the exact candidate and then read, update, and schedule maintenance on the resulting control state with its own code. Predecessors that do not read the current family SHALL be identified by their exported capabilities, not by version number.

#### Scenario: The candidate changes control state
- **WHEN** the candidate writes control state during its activation
- **THEN** every eligible predecessor SHALL still read, update, and maintain it without error

## MODIFIED Requirements

### Requirement: The installed release activates itself
An update is performed by the release that is already installed against a tree newer than it, so the updater SHALL NOT assume the layout of the tree it has just installed. The package manifest SHALL declare the activation contracts the tree serves in `updateActivationContracts`, and a tree serving `activate-v1` SHALL ship `bin/activate.js`. After the global installation succeeds, an updater that finds a contract it serves SHALL start that entry with the data directory and the target version and SHALL relay the entry's line-delimited progress events (`materializing`, `phase`, `warmup`, `completed`, `failed`) into its own transaction journal and progress display; the entry SHALL activate the tree it ships in with that tree's own release code. The updater SHALL resolve no path inside the installed tree other than `package.json` and the declared entry.

A tree that declares no contract the updater serves SHALL be activated in-process with the layout that tree had, so an updater older than the contract and an installation of an older preview both remain supported. A delegated activation SHALL succeed only when the entry exits successfully after reporting `completed`; a `failed` event, an unsuccessful exit, an exit without a verdict, a malformed line, or a malformed known event SHALL fail the update with the entry's own bounded reason under the existing rollback rules, except that a failure after the active reference is committed SHALL be settled as a completed update. A well-formed event of an unknown kind SHALL be ignored. The entry's stderr SHALL be captured and bounded, never shared with the terminal.

#### Scenario: The installed tree serves the contract
- **WHEN** the newly installed manifest lists `activate-v1` and the updater serves it
- **THEN** the updater starts the tree's `bin/activate.js` and advances its journal phases and progress display from the events that entry reports
- **AND** the updater runs none of the materialization, certification, or warmup steps itself

#### Scenario: The installed tree predates the contract
- **WHEN** the newly installed manifest declares no `updateActivationContracts`, or only contracts the updater does not serve
- **THEN** the updater activates the tree in-process exactly as it did before the contract existed

#### Scenario: The tree's own activation fails
- **WHEN** the entry reports `failed`, exits unsuccessfully, or exits without reporting `completed`
- **THEN** the update fails with the entry's own reason or its exit status and bounded stderr, and the prior release is restored under the existing rollback rules

#### Scenario: The tree changes its own layout
- **WHEN** a later release renames or removes an entry its activation uses
- **THEN** every installed updater that serves the contract still activates it, because the layout is read only by the tree's own entry

