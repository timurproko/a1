## MODIFIED Requirements

### Requirement: Installation failures are concise and truthful
After installer execution begins, a failure SHALL clear the progress row, restore cursor visibility and terminal styling, write no success text, return a nonzero status, and emit one default stderr line in the form `installation failed: <concise reason>`. The concise reason SHALL come from this fixed vocabulary: `invalid command arguments`, `--verbose was supplied more than once`, `--develop was supplied more than once`, `--version was supplied more than once`, `--develop cannot be combined with --version`, `--version requires an exact development version`, `--help cannot be combined with another option`, `unsupported option`, `unexpected argument`, `npm is unavailable`, `could not resolve the selected release`, `the selected release was not found`, `network access failed`, `registry authentication failed`, `permission was denied`, `npm installation failed`, `the npm global installation cannot be verified`, `the installed package is incomplete`, `the installed package identity is invalid`, `the installed version does not match the selected release`, `launcher verification failed`, `the installed command is not active in this shell`, `another command takes precedence`, `activation failed`, `existing installation ownership could not be verified`, `existing installation could not be updated`, or `unexpected installer failure`.

The installer SHALL accept every Node.js runtime at version 22.19.0 or later, including newer major versions, without an upper major bound. An older runtime SHALL fail with status `1` and the single stderr line `a1 needs a newer Node.js: you have <runtime version>, install 22.19 or later`, where `<runtime version>` is the running Node.js version string, and SHALL NOT use the `installation failed:` prefix. The application and installer package manifests SHALL declare the same floor-only `engines.node` range `>=22.19.0`.

The installer SHALL retain only a bounded private child-diagnostic tail and classify common npm startup, network, registry, permission, integrity, activation, and launcher failures without replaying raw warning output, stack traces, progress fragments, credentials, request headers, or an unbounded npm transcript. Any temporary progress log SHALL be installer-owned and removed after success or after its bounded failure evidence has been consumed.

An explicit troubleshooting mode MAY append bounded terminal-safe diagnostics after failure and SHALL redact credentials and tokens. It SHALL NOT change the operation's verdict. Cancellation SHALL be unsuccessful with status `130`, SHALL terminate or contain owned children, SHALL restore terminal state, SHALL never report installation success, and SHALL use `installation cancelled` as its exact concise result. For interrupted fresh installation, the installer SHALL delete only its owned temporary evidence and SHALL permit retry without claiming rollback or deleting an uncertain npm-owned global tree.

#### Scenario: Global installation fails with noisy stderr
- **WHEN** npm writes warnings and an actionable error before exiting unsuccessfully
- **THEN** the default terminal SHALL receive one concise installer-owned failure line and no raw warning wall
- **AND** the installer SHALL return nonzero

#### Scenario: Troubleshooting is requested
- **WHEN** the same failure occurs under the explicit verbose mode
- **THEN** the installer MAY append a bounded sanitized diagnostic after the failure result
- **AND** SHALL redact credentials/tokens and preserve the same unsuccessful verdict

#### Scenario: The user cancels a fresh installation
- **WHEN** cancellation is received while npm may be mutating the first global installation
- **THEN** the installer SHALL terminate or await the child according to its safe signal boundary, clear progress, and report cancellation without success
- **AND** SHALL NOT recursively delete or claim rollback authority over an uncertain global package tree

#### Scenario: Rendering or execution is interrupted
- **WHEN** success, failure, signal cancellation, or an unexpected exception ends an interactive run
- **THEN** the cursor, foreground style, and progress row SHALL be restored exactly once
- **AND** no spinner worker, timer, or child-output log SHALL remain live

#### Scenario: The user retries after interruption
- **WHEN** a prior fresh installation ended unsuccessfully and no valid existing installation can be delegated to
- **THEN** a retry SHALL either converge through npm and complete all verification or fail truthfully without requiring deletion of A1 user data

#### Scenario: A newer Node.js major installs
- **WHEN** the installer runs on Node.js `v26.13.0` or another release at or above 22.19.0
- **THEN** the runtime check SHALL pass and installation SHALL proceed

#### Scenario: An outdated Node.js is detected
- **WHEN** the installer runs on Node.js `v20.11.0`
- **THEN** stderr SHALL receive exactly `a1 needs a newer Node.js: you have v20.11.0, install 22.19 or later`
- **AND** the installer SHALL return status `1` without starting npm work
