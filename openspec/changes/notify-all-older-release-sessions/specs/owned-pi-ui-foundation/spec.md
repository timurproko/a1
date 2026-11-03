## ADDED Requirements

### Requirement: Every older owned process shows persistent restart readiness
When local release observation establishes that an approved active release is newer than the version executing an owned A1 process, that process SHALL show `Update installed · Restart to update` in its existing compact non-transcript status region. The status SHALL be emitted independently in every active older bare-A1 resident session, bare-A1 solo session, and `a1 pi` process containing this behavior. It SHALL remain visible until that process exits, take no focus or input, and disappear naturally when a restarted process executes the active version.

The status SHALL describe actual executing-versus-active release state and SHALL NOT imply that the user launched the active release. Registry failure, another process performing activation, or a different active session receiving the first completion event SHALL not suppress it.

#### Scenario: All resident agents are older
- **WHEN** several active resident Agent tabs execute an older release and another process activates a newer approved same-channel release
- **THEN** every older Agent process SHALL show `Update installed · Restart to update`
- **AND** the notice SHALL remain present in each process until it exits

#### Scenario: Solo and comparison processes are older
- **WHEN** active `a1 solo` and `a1 pi` processes execute an older release than the approved active same-channel release
- **THEN** each SHALL show the same compact restart status without adding update content to its transcript

#### Scenario: A current process starts
- **WHEN** a process executes the approved active release
- **THEN** it SHALL show no restart-ready status from that release
