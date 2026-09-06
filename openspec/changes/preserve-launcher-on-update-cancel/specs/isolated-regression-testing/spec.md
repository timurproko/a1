## ADDED Requirements

### Requirement: Exact-package gates prove launcher continuity across cancellation
Release validation SHALL exercise the physical global package and launcher boundary with an exact packed candidate. It SHALL inject cancellation, updater loss, and npm failure before package mutation and after each observable launcher-removal, package-replacement, launcher-creation, and transaction boundary. Every case SHALL prove the complete platform launcher set is callable, recovery uses one verified owner, the prior immutable cohort remains protected until target activation, and rerunning `a1` converges without manual repair.

#### Scenario: Windows launcher replacement is interrupted
- **WHEN** validation interrupts replacement around the shell, command, and PowerShell launcher mutations
- **THEN** `a1`, `a1.cmd`, and `a1.ps1` SHALL all be restored or verified before cancellation is acknowledged and each SHALL resolve through the same verified recovery disposition

#### Scenario: Unix launcher replacement is interrupted
- **WHEN** validation interrupts replacement around the executable launcher mutation on Linux or macOS
- **THEN** the launcher SHALL be restored or verified as executable before cancellation is acknowledged

#### Scenario: Invoking updater is terminated
- **WHEN** validation terminates the updater after it delegates replacement but before npm completes
- **THEN** the detached recovery owner SHALL establish a callable launcher and a subsequent invocation SHALL converge without manual npm installation

#### Scenario: Recovery evidence is corrupted
- **WHEN** validation changes a capsule identity, path, payload digest, transaction identity, or worker identity
- **THEN** recovery SHALL fail closed without executing the changed payload or overwriting launchers outside the canonical global npm bin root

#### Scenario: Cancellation regression removes the command
- **WHEN** any tested cancellation or process-loss point leaves a launcher absent, non-executable, bound to incomplete content, or dependent on manual cleanup
- **THEN** release validation SHALL fail before publication
