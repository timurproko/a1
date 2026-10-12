## MODIFIED Requirements

### Requirement: Session exclusivity is enforced by the operating system
Every A1-owned runtime that writes a Pi session on a supported platform, whether resident, direct/fallback, or Pi-comparison, SHALL acquire the same profile-neutral native session-writer lease before opening it for writing, regardless of the resident setting. This SHALL cover startup with or without explicit session selection and every in-runtime replacement, including new, resume, fork, and import, and appends to another session's metadata. Direct modes SHALL NOT start a resident host, holder, or bridge to perform this check. The lease SHALL be an operating-system lock held by the writer process itself. Lease identity SHALL resolve case, junction/symlink, hard-link and existing-file aliases, and SHALL reserve a canonical parent/name for a new file without a gap when binding its created file identity. A newly reserved file SHALL remain compatible with Pi's first-message persistence: binding stable identity SHALL NOT cause the first user message to fail exclusive creation, duplicate the session header, change the generated session identity, or leave the runtime unable to respond. Lock custody SHALL follow the actual session writer lifetime; death of the holder alone SHALL NOT release exclusivity while the writer remains alive. Replacement SHALL require lease acquisition and verified exit of the previous writer/tree; unavailable proof SHALL block replacement. Session switching SHALL acquire the target before releasing the previous writer lease and preserve the old session on failed admission. Kernel cleanup SHALL release abandoned leases only once no live owner remains. Unmodified external Pi, older nonparticipating releases, and arbitrary file writers are outside this cooperative contract and SHALL NOT be claimed as covered.

#### Scenario: Orphaned child still alive during recovery
- **WHEN** server replacement finds a tab whose previous A1 process may still be running but cannot be verified
- **THEN** the lease SHALL prevent a second process from appending to that session, and the tab SHALL report the conflict instead of starting

#### Scenario: Holder dies before its writer exits
- **WHEN** a holder is killed but its A1 writer has not yet been proven exited
- **THEN** the writer-bound lease SHALL prevent a replacement from writing the same session, and uncertainty SHALL keep recovery blocked

#### Scenario: Direct fallback targets a held session
- **WHEN** a direct or fallback A1 runtime selects a session held by a resident writer
- **THEN** admission SHALL fail safely or offer an explicit fork, and SHALL NOT start a second writer or silently attach the direct invocation

#### Scenario: Session path alias
- **WHEN** two A1-owned runtimes select aliases of the same session file
- **THEN** both SHALL resolve the same lock authority and at most one SHALL open the session for writing

#### Scenario: Session switch conflicts
- **WHEN** a running session attempts to switch to a session already held elsewhere
- **THEN** the switch SHALL be rejected without losing the old session or its lease

#### Scenario: Resident tabs disabled
- **WHEN** `residentTabs` is off and two direct `a1 --session` launches select the same session
- **THEN** exactly one SHALL write it, and no resident host, holder, or bridge SHALL start

#### Scenario: First prompt in a fresh session
- **WHEN** an A1-owned runtime reserves a new session and submits its first user message
- **THEN** the message SHALL persist without `EEXIST` after the lease binds the created file identity
- **AND** the session file SHALL contain one valid header with the originally generated identity followed by the submitted message
- **AND** the runtime SHALL retain exclusive writer authority and continue the turn

#### Scenario: First prompt after new-session replacement
- **WHEN** a running A1-owned runtime creates a new session and submits that session's first user message
- **THEN** the new target SHALL persist without `EEXIST` under its bound writer lease
- **AND** the previous writer lease SHALL be released only after the new target is active
