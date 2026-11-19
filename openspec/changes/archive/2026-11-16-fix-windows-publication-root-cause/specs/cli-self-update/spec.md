## ADDED Requirements

### Requirement: Installer-activated targets settle abandoned replacement journals

When an explicit update holds the installation execution lease and its requested target is already the approved active release, it MAY settle an abandoned ownership-released journal left by an installer recovery only after validating the transaction, capsule, canonical package root, installed target manifest, and complete target launcher set, and establishing that neither recorded recovery owner is alive. An unsettled live owner, different target, different package, incomplete launchers, or unavailable authority SHALL preserve the existing recovery path. Verified external activation SHALL be treated as committed before attempting journal persistence so a bookkeeping failure cannot roll it back.

#### Scenario: Installer recovery already activated the requested target

- **WHEN** the requested target is active and installed, its launchers are valid, and the abandoned transaction's journal and capsule owners are no longer alive
- **THEN** the updater SHALL durably settle the transaction and take the up-to-date path without restarting the old capsule or npm replacement

#### Scenario: Recovery mutation remains live or unverifiable

- **WHEN** either recorded recovery owner is alive or the capsule, target, package root, or launcher authority cannot be verified
- **THEN** the updater SHALL NOT discard the active transaction as an already completed installer recovery

### Requirement: Recovery heartbeats cannot terminate package ownership

A Windows sharing refusal during a detached recovery worker heartbeat SHALL NOT terminate that worker or orphan its npm child. Heartbeat failures SHALL remain bounded diagnostics while the worker retains responsibility for npm settlement and the callable-launcher result.

#### Scenario: A native Windows reader blocks heartbeat replacement

- **WHEN** an actual Windows file handle denies heartbeat owner-file replacement beyond the rename retry allowance
- **THEN** the worker SHALL remain alive, retain the heartbeat error in diagnostics, and publish its npm settlement result after the handle and npm operation settle
