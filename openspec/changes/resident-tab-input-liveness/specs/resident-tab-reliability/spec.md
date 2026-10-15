## ADDED Requirements

### Requirement: Terminal input is never queued behind tab lifecycle work
The resident server SHALL read and route an attached terminal's input, paste, mouse, focus, resize, tab view, and tab list requests without waiting for any tab lifecycle request from that terminal or another terminal. Attach start, tab create, close, restart, rename, and reorder SHALL run apart from that input path, in arrival order per terminal, and a lifecycle failure SHALL be reported to the terminal without closing its connection. Waiting for a tab start slot SHALL have a deadline and SHALL end in a typed `tab-start-busy` failure. Crash recovery SHALL NOT take a free start slot while a user-requested tab start is waiting, and the configured concurrent-start limit SHALL still apply.

#### Scenario: New tab while start slots are held by recovering tabs
- **WHEN** every start slot is held by crash recovery and the user opens a new tab
- **THEN** keystrokes and mouse events SHALL keep reaching the viewed tab and tab switching SHALL keep working while the new tab waits

#### Scenario: Start slot never frees
- **WHEN** no start slot becomes free before the start deadline
- **THEN** the new tab request SHALL fail with `tab-start-busy`, the terminal SHALL show that failure, and the terminal SHALL stay attached

#### Scenario: Registry commit fails during a rename
- **WHEN** the registry commit for a tab rename fails
- **THEN** the rename SHALL be refused with a notice and the terminal SHALL stay attached with working input

#### Scenario: Diagnosing a stuck lifecycle request
- **WHEN** a lifecycle request has run longer than ten seconds
- **THEN** `a1 tabs host status` SHALL show the pending lifecycle work as stalled along with start-slot use, and a diagnostic event without request content SHALL be logged
