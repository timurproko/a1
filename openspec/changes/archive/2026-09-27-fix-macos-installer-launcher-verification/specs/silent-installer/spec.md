## MODIFIED Requirements

### Requirement: Package-manager launch indirection executes the installer
The `a1-install` executable SHALL recognize direct execution by canonical filesystem identity rather than requiring the invoking path to lexically equal the package module path. It SHALL execute through npm-generated Unix file symlinks, direct package-file invocation, and supported Windows npm command shims while ordinary ESM import remains side-effect free. Resolving launch indirection SHALL use only supported Node built-ins and SHALL NOT broaden execution based only on a basename, option, environment variable, or expected directory shape.

Installed Unix application-launcher ownership SHALL likewise compare the canonical filesystem identity of the launcher target with the canonical expected application entry. Lexical aliases in an ancestor path SHALL NOT cause a valid npm launcher to be rejected, and canonicalization SHALL NOT permit a launcher resolving to any other entry.

#### Scenario: npm invokes the Unix bin symlink
- **WHEN** npm installs the exact installer package into an isolated Unix global prefix and the generated `bin/a1-install` symlink is invoked with `--help`
- **THEN** the installer SHALL follow that launch indirection to recognize direct execution
- **AND** SHALL exit zero with the exact help contract on stdout and empty stderr

#### Scenario: A consumer imports installer helpers
- **WHEN** another ESM module imports the installer executable to use or test its exported helpers
- **THEN** the installer SHALL NOT run its main operation, write help or installation output, or alter the importing process verdict

#### Scenario: The npm prefix has a lexical filesystem alias
- **WHEN** the installed `a1` launcher and expected application entry are reached through different lexical ancestor paths that canonically identify the same files
- **THEN** launcher verification SHALL accept the canonical identity match
- **AND** SHALL still reject a launcher whose canonical target is any other entry
