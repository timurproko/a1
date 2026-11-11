## ADDED Requirements

### Requirement: Cleanup refuses a checkout with a live session attachment

Before destructive work on a candidate, completed-delivery cleanup (`complete`, sweep, and the enabled queue) SHALL read A1's editing-claim records for that exact checkout and SHALL retain the checkout with reason `attached-session` when a claim's recorded process is alive. An absent claim store, an absent claim, or a claim whose process no longer exists SHALL NOT block. A malformed or unreadable claim for the candidate SHALL block with `attached-session-unverifiable` rather than be ignored. The check SHALL require no A1 installation, SHALL NOT modify or remove claim records, and SHALL NOT replace any existing eligibility, ownership, content, or compare-and-delete safeguard.

#### Scenario: A live session is attached

- **WHEN** cleanup evaluates a merged, released candidate that a running A1 session has attached
- **THEN** it SHALL report `attached-session` and remove nothing

#### Scenario: The claiming process has exited

- **WHEN** the claim record names a process that no longer exists
- **THEN** cleanup SHALL continue through its ordinary safeguards

#### Scenario: A1 is not installed

- **WHEN** no A1 claim store exists on the machine
- **THEN** cleanup SHALL behave as before
