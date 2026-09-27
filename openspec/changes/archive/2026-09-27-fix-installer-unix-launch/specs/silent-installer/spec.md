## ADDED Requirements

### Requirement: Package-manager launch indirection executes the installer
The `a1-install` executable SHALL recognize direct execution by canonical filesystem identity rather than requiring the invoking path to lexically equal the package module path. It SHALL execute through npm-generated Unix file symlinks, direct package-file invocation, and supported Windows npm command shims while ordinary ESM import remains side-effect free. Resolving launch indirection SHALL use only supported Node built-ins and SHALL NOT broaden execution based only on a basename, option, environment variable, or expected directory shape.

#### Scenario: npm invokes the Unix bin symlink
- **WHEN** npm installs the exact installer package into an isolated Unix global prefix and the generated `bin/a1-install` symlink is invoked with `--help`
- **THEN** the installer SHALL follow that launch indirection to recognize direct execution
- **AND** SHALL exit zero with the exact help contract on stdout and empty stderr

#### Scenario: A consumer imports installer helpers
- **WHEN** another ESM module imports the installer executable to use or test its exported helpers
- **THEN** the installer SHALL NOT run its main operation, write help or installation output, or alter the importing process verdict
