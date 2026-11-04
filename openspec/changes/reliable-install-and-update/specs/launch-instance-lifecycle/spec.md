## ADDED Requirements

### Requirement: The exit watcher finishes quietly once the terminal is restored
When the exit watcher restores the inherited terminal foreground group on Linux or macOS and the platform refuses with `EIO` or `EPERM` because the watcher's process group is orphaned or the shell already owns the terminal, the watcher SHALL treat the terminal as restored and SHALL print nothing. On Windows, Linux, and macOS, every armed exit notice SHALL be delivered even when process-group or job cleanup or terminal restoration fails, and the watcher SHALL report only a failure that leaves the terminal unusable.

#### Scenario: The shell reclaimed the terminal first
- **WHEN** an A1 launch exits and the shell is already the terminal foreground group when the watcher runs
- **THEN** no `exit watcher` message SHALL appear
- **AND** an armed exit notice such as a running-Agent reminder SHALL be printed

### Requirement: A launch attaches to its own healthy resident host
When a launch's resident continuity check fails but a resident host of the launching release answers its maintenance probe, the launch SHALL attach to that host instead of selecting a retained release. A launch SHALL NOT end with a closed attach handshake and no actionable message; when no usable host exists, it SHALL print one reason and one next step.

#### Scenario: Continuity fails beside a healthy same-release host
- **WHEN** the launching release's host answers status while the continuity check reports a mismatched source
- **THEN** `a1` SHALL attach to that host and show its tabs

#### Scenario: No usable host exists
- **WHEN** neither the launching release's host nor a retained release can serve the launch
- **THEN** A1 SHALL print one reason and one next step and exit nonzero
