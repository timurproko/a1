## ADDED Requirements

### Requirement: Later launches recover automatically after forced process loss
After the user or operating system forcibly terminates A1's supervisor, launch guardian, root runtime, resident role, or all A1 Node processes, a subsequent ordinary launch SHALL reconcile recoverable stale runtime ownership and establish a usable launch without asking the user to remove control state, identify PIDs, restart a supervisor, or reboot. Recovery SHALL preserve persisted sessions, selected profile and launch mode, explicit session selection, surviving instance isolation, and exclusive session-writer admission. Recovery SHALL NOT claim to restore unsaved process memory or authorize termination of unrelated processes.

#### Scenario: All A1 Node processes were killed
- **WHEN** a new invocation starts after all prior A1 Node processes have been forcibly terminated and stale runtime records remain
- **THEN** A1 SHALL recover automatically and open the requested UI using a verified release
- **AND** it SHALL NOT present stale live-instance records as a reason the user must manually repair startup

#### Scenario: Only one lifecycle role was killed
- **WHEN** a supervisor, guardian, root runtime, or resident role was terminated while other A1 processes survive
- **THEN** a subsequent launch SHALL reconcile the affected ownership through its declared lifecycle boundaries and continue when recovery is proven safe
- **AND** it SHALL preserve unrelated live instances and SHALL NOT create a second writer for a surviving session

#### Scenario: Forced termination recovery is exercised by tests
- **WHEN** isolated regression fixtures emulate process loss and launch again
- **THEN** they SHALL terminate only explicitly fixture-owned process identities and use isolated runtime, data, and session roots
- **AND** they SHALL demonstrate that unrelated sentinel processes and surviving independent instances are not terminated by recovery
