## Purpose
Decides what A1 tells users when resuming a session needs a fork decision.

## ADDED Requirements

### Requirement: Fork prompt states why a fork is offered

When resuming a session that another A1 process holds open, the fork prompt SHALL say "Session is open in another A1 process." and SHALL NOT say that the session was found in a different project.

#### Scenario: Session open in another process

- **WHEN** a user resumes a session whose writer lock another A1 process holds
- **THEN** the prompt says "Session is open in another A1 process." and asks whether to fork into the current directory

#### Scenario: Session from another project

- **WHEN** a user resumes a session recorded in another existing project folder
- **THEN** the prompt still says "Session found in different project:" followed by that folder
