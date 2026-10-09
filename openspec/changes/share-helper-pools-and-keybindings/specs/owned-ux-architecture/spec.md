## ADDED Requirements

### Requirement: Process-wide services are created once and injected
A service whose cost or state is process-wide, such as a forked helper pool, a native clipboard bridge, an image conversion worker set, or the terminal keybinding registry, SHALL be constructed once by composition and injected into every screen or presenter that uses it. A screen SHALL NOT fork a helper, reset a process-global registry, or hold a module-level cap of its own.

#### Scenario: A second session presenter is constructed
- **WHEN** composition constructs a second session presenter in the same process
- **THEN** no additional helper process SHALL be forked and the active keybinding manager SHALL be unchanged

#### Scenario: A presenter builds its chrome
- **WHEN** a footer, status, header, or info presenter is constructed
- **THEN** the pi-tui keybinding registry SHALL keep the manager composition applied
