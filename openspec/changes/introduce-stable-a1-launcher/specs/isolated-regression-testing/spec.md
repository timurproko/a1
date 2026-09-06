## ADDED Requirements

### Requirement: Stable launcher and runtime artifacts are independently release-gated
Release validation SHALL build, identify, and verify the public launcher package and internal runtime package independently, then exercise them together through clean installation, combined-package migration, stable and development update, cancellation, process loss, reboot-equivalent recovery, compatibility rejection, rollback, and uninstall on Windows, Linux, and macOS. Evidence SHALL prove ordinary runtime updates do not change public launcher bytes or identity.

#### Scenario: Fresh two-package installation is validated
- **WHEN** an exact launcher package and matching runtime package are assembled
- **THEN** installation SHALL expose exactly one public `a1` command and launch the verified runtime on every supported platform

#### Scenario: Combined installation migrates
- **WHEN** the accepted cancellation-safe combined package updates to the split layout
- **THEN** validation SHALL prove the command remains callable at each migration boundary and the prior immutable runtime remains a valid rollback cohort

#### Scenario: Runtime update is interrupted
- **WHEN** validation cancels or terminates runtime installation at each destructive package boundary
- **THEN** public launcher bytes SHALL remain unchanged and the next invocation SHALL recover without manual repair

#### Scenario: Host restarts during runtime update
- **WHEN** validation removes every volatile process while preserving durable launcher, transaction, and release state
- **THEN** the launcher SHALL select or restore one compatible verified runtime without modifying itself

#### Scenario: Launcher/runtime compatibility differs
- **WHEN** fixtures require newer, older-compatible, unknown-optional, or contradictory launcher protocol features
- **THEN** validation SHALL observe the declared launch, rollback, upgrade-required, or fail-closed outcome

#### Scenario: Either artifact changes after validation
- **WHEN** launcher or runtime bytes differ from their independently accepted digest before publication
- **THEN** publication SHALL fail before either package or dist-tag is changed
