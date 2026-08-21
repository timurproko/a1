## MODIFIED Requirements

### Requirement: Update transitions remain release-gating scenarios
Stable and preview update gates SHALL exercise exact target resolution, verified owned-process shutdown, mutable-package unlock, single-pass immutable materialization, certification, activation, endpoint verification, transaction recovery, rollback, and clean process exit without manual PID or state deletion. Release evidence SHALL record phase durations and payload read/write counts for the exact packaged updater. On the accepted Windows release runner, the representative unchanged-dependency preview fixture of at least 10,000 payload files SHALL complete post-npm materialization through verified activation within 30 seconds and SHALL perform no more than one complete source-payload read and one candidate-payload write for a new release.

#### Scenario: Update is interrupted
- **WHEN** a fault occurs at a durable update phase
- **THEN** rerunning the command SHALL converge to one verified active or rollback cohort

#### Scenario: Representative preview update is measured
- **WHEN** the exact packaged updater replaces a preview whose dependency versions are unchanged on the accepted Windows release runner
- **THEN** evidence SHALL show post-npm verified activation completes within 30 seconds without a complete post-copy certification read

#### Scenario: Performance budget regresses
- **WHEN** the measured fixture exceeds the time or payload-pass budget
- **THEN** preview and stable release gating SHALL fail with phase timing and file-operation diagnostics

#### Scenario: Packaged update completes
- **WHEN** the exact packaged update transition reports success or failure
- **THEN** the updater process SHALL exit cleanly and return control to the invoking terminal without requiring `Ctrl+C`
