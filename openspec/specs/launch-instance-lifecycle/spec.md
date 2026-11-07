# launch-instance-lifecycle Specification

## Purpose
Defines independent ownership, containment, termination, and lifecycle evidence for every interactive A1 command invocation and all processes it creates.

## Requirements

### Requirement: A launch is one directly attached process
Each `a1` launch SHALL run the selected release's UI as one child attached to the launching terminal and SHALL return that child's exit status, without launch-instance records, process containment, or an exit watcher.

#### Scenario: The UI exits
- **WHEN** the owned UI process exits
- **THEN** the launcher SHALL return its exit status
- **AND** when the exit was unclean the launcher SHALL restore the terminal and print any armed unclean-exit notice
