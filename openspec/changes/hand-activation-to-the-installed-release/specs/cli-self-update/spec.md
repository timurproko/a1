## ADDED Requirements

### Requirement: The installed release activates itself
An update is performed by the release that is already installed against a tree newer than it, so the updater SHALL NOT assume the layout of the tree it has just installed. The package manifest SHALL declare the activation contracts the tree serves in `updateActivationContracts`, and a tree serving `activate-v1` SHALL ship `bin/activate.js`. After the global installation succeeds, an updater that finds a contract it serves SHALL start that entry with the data directory and the target version and SHALL relay the entry's line-delimited progress events (`materializing`, `phase`, `warmup`, `completed`, `failed`) into its own transaction journal and progress display; the entry SHALL activate the tree it ships in with that tree's own release code. The updater SHALL resolve no path inside the installed tree other than `package.json` and the declared entry.

A tree that declares no contract the updater serves SHALL be activated in-process with the layout that tree had, so an updater older than the contract and an installation of an older preview both remain supported. A delegated activation SHALL succeed only when the entry exits successfully after reporting `completed`; a `failed` event, an unsuccessful exit, an exit without a verdict, or an event the updater cannot interpret SHALL fail the update with the entry's own bounded reason under the existing rollback rules. The entry's stderr SHALL be captured and bounded, never shared with the terminal.

#### Scenario: The installed tree serves the contract
- **WHEN** the newly installed manifest lists `activate-v1` and the updater serves it
- **THEN** the updater starts the tree's `bin/activate.js` and advances its journal phases and progress display from the events that entry reports
- **AND** the updater runs none of the materialization, certification, warmup, or supervision steps itself

#### Scenario: The installed tree predates the contract
- **WHEN** the newly installed manifest declares no `updateActivationContracts`, or only contracts the updater does not serve
- **THEN** the updater activates the tree in-process exactly as it did before the contract existed

#### Scenario: The tree's own activation fails
- **WHEN** the entry reports `failed`, exits unsuccessfully, or exits without reporting `completed`
- **THEN** the update fails with the entry's own reason or its exit status and bounded stderr, and the prior release is restored under the existing rollback rules

#### Scenario: The tree changes its own layout
- **WHEN** a later release renames or removes an entry its activation uses
- **THEN** every installed updater that serves the contract still activates it, because the layout is read only by the tree's own entry
