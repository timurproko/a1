## MODIFIED Requirements

### Requirement: Default normal-product entries share delivered contracts without compatibility modes

Ordinary A1 and the optional pi naming entry SHALL use one public option parser and the same normal-product session, runtime, and API lifecycle. Both SHALL accept Pi-style positional instructions and the `--` boundary. The pi naming entry SHALL treat a leading `install`, `remove`, `uninstall`, `list`, `update`, `config`, `auth`, or `mcp` as a control command dispatched through the ordinary A1 command grammar, SHALL map `update self`, `update pi`, and `update --self` to bare `update`, and SHALL refuse `uninstall` without a package source with a diagnostic that names `a1 uninstall` as the way to remove the application. Executable spelling SHALL NOT determine product capabilities or select a reduced feature set.

A Pi option or input transport that A1 does not implement SHALL fail with status 2 and a diagnostic saying it is not available, and SHALL NOT be accepted and ignored.

#### Scenario: Equivalent default entries
- **WHEN** equivalent implemented options and instructions enter either public name
- **THEN** the same normal A1 services, settings, APIs and ownership guarantees SHALL apply

#### Scenario: Later transport is requested
- **WHEN** an invocation uses an unimplemented Pi option such as `--mode` or `--print`, or an `@file` input
- **THEN** the entry SHALL fail with status 2 and a diagnostic naming what is unavailable rather than launch the wrong runtime or ignore the option

#### Scenario: Existing lifecycle is reused
- **WHEN** either entry starts or replaces a normal-product runtime
- **THEN** the single normal-product runtime identity, readiness, reporting and disposal ownership SHALL apply without another endpoint or reporter

#### Scenario: The naming entry is asked to remove the application
- **WHEN** the pi naming entry receives `uninstall`, `uninstall --yes`, or `uninstall --purge` without a package source
- **THEN** it SHALL exit with status 2 after a diagnostic naming `a1 uninstall` and SHALL remove nothing
