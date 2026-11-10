## ADDED Requirements

### Requirement: Cleanup reports content and development-process blockers together

Eligible cleanup candidates SHALL receive a bounded combined preflight covering existing content checks and exact checkout-owned development processes before generated-root purge. Reports SHALL retain compatible primary reasons and list actionable blockers using paths and process identities, not file contents or complete command lines. Unavailable inspection SHALL remain distinguishable from an empty process inventory.

#### Scenario: Multiple local blockers

- **WHEN** an eligible candidate contains an untracked export and a running development process
- **THEN** one report SHALL identify both without deleting content or stopping processes

#### Scenario: Process inventory is unavailable

- **WHEN** the process inspector cannot establish process identity
- **THEN** the report SHALL identify uncertainty instead of claiming no process is running

#### Scenario: Preview and sweep retain their authority

- **WHEN** preview or an ordinary sweep encounters a development process
- **THEN** diagnostics SHALL NOT confer process-stop or user-file-movement authority

### Requirement: Exact completed cleanup can stop explicitly authorized development processes

Only explicitly requested exact-candidate completed cleanup MAY stop candidate development processes after merged/released eligibility and clean-content checks. It SHALL verify checkout code association and process-start identity before each stop, protect caller/ancestors and foreign processes, bound settlement, and repeat ordinary cleanup checks before purge. Sweep and preview SHALL NOT acquire this authority.

#### Scenario: Stop a verified development instance

- **WHEN** exact completed cleanup is requested with development-process stop authority and the candidate passes all eligibility/content gates
- **THEN** only freshly verified processes running that checkout's code MAY be stopped before ordinary cleanup resumes

#### Scenario: Preserve protected or reused process identities

- **WHEN** a selected PID is reused, belongs to the caller or its ancestors, refers to another checkout or installed release, or cannot be verified
- **THEN** cleanup SHALL NOT terminate it and SHALL retain the candidate under a named blocker

#### Scenario: Retain blocked candidates

- **WHEN** the candidate is dirty, owned, Git-locked, unmerged, remote-backed, or otherwise ineligible
- **THEN** no development process SHALL be stopped

#### Scenario: A process survives

- **WHEN** authorized process shutdown does not settle within its bound
- **THEN** cleanup SHALL retain the worktree and report survivors rather than force file removal

### Requirement: Named export preservation precedes ordinary completed cleanup

An explicit confirmed operation MAY preserve one named regular untracked HTML/JSONL export from an eligible released merged candidate into `~/.a1/exports/`. It SHALL use scoped authority, exclusive destination naming, durable byte verification, source revalidation, and resumable journaling before unlinking only that source. It SHALL preserve other content and confer no general cleanup or export-disposal authority.

#### Scenario: Preserve one selected export

- **WHEN** the exact candidate, change, PR, relative export file, and preservation confirmation pass existing evidence and content gates
- **THEN** a verified copy SHALL be stored outside the checkout without overwriting
- **AND** only the unchanged selected source MAY be removed before a separate ordinary cleanup

#### Scenario: Refuse unsafe content

- **WHEN** the source is tracked, linked, escaped, replaced, or accompanied by another unknown-content blocker
- **THEN** preservation SHALL retain the worktree and user data under a named blocker

#### Scenario: Resume interrupted preservation

- **WHEN** preservation is interrupted after a verified destination is durable
- **THEN** repeating the exact operation SHALL safely resume using its journal without overwriting another file or trusting a replaced source

#### Scenario: Preserve existing cleanup safeguards

- **WHEN** named export preservation succeeds
- **THEN** ordinary cleanup SHALL still independently require all merge/archive/remote, ownership, identity, content, non-force removal, and local-ref safeguards
