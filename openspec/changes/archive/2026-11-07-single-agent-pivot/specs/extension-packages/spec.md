## MODIFIED Requirements

### Requirement: Package commands run without the interactive runtime
Package commands SHALL execute in the installed package process and SHALL NOT
materialize a release, take the foreground lease, or start an interactive
session. They SHALL exit with a status that distinguishes
success from failure.

#### Scenario: Install with no A1 session running
- **WHEN** the user installs a package and no A1 instance is running
- **THEN** A1 SHALL complete the install without starting an interactive profile or a background A1 process

#### Scenario: Install while an A1 session is running
- **WHEN** the user installs a package from a second terminal while bare `a1` is running
- **THEN** A1 SHALL complete the install without disturbing the running session's ownership
