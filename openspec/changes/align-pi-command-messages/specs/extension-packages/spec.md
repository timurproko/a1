## MODIFIED Requirements

### Requirement: Package failures are actionable and preserve Pi parity
When an accepted package operation cannot proceed, A1 SHALL preserve pinned Pi's operational failure format and SHALL NOT print a raw stack trace as the primary message. A missing package manager, an unreachable network, and a source with no matching installed package SHALL each be distinguishable from the message alone. A1 SHALL preserve the full displayed error detail, including multiline whitespace, punctuation, and pinned source suggestions, without independently truncating or flattening it. A1 SHALL use pinned Pi's `Unknown package command error` fallback for a non-Error thrown value.

#### Scenario: Package manager is unavailable
- **WHEN** the underlying package manager cannot be run
- **THEN** A1 SHALL name that as the cause and SHALL NOT leave a partially written profile behind

#### Scenario: Removing something not installed
- **WHEN** the user removes a source that is not configured in the A1 profile
- **THEN** A1 SHALL print red `No matching package found for <source>` to stderr and SHALL exit with a failure status

#### Scenario: An operation throws
- **WHEN** pinned Pi's package manager rejects an accepted operation with a detail
- **THEN** A1 SHALL print red `Error: <detail>` to stderr and SHALL exit with a failure status

#### Scenario: Command guidance is needed
- **WHEN** A1 rejects package-command syntax before an operation begins
- **THEN** any command guidance SHALL use the `a1 pi` namespace rather than instructing the user to invoke standalone Pi

#### Scenario: Updating something not installed
- **WHEN** `a1 pi update <source>` has no matching user-scope package under pinned Pi's package-identity rules
- **THEN** A1 SHALL preserve Pi's red `Error: No matching package found for <source>` failure and any pinned `Did you mean <suggestion>?` suffix, including punctuation
- **AND** it SHALL exit with status one rather than substitute the remove command's not-found transcript

#### Scenario: Updating an equivalent source spelling
- **WHEN** the requested source identifies a configured user package under pinned Pi's identity rules but differs from its stored source string
- **THEN** A1 SHALL perform the same matching operation and emit the same resulting transcript as pinned Pi for equivalent user settings
- **AND** A1 SHALL NOT reject the source solely because a separate literal or prefix comparison fails

#### Scenario: Operational detail spans multiple lines
- **WHEN** an accepted operation fails with a message containing repeated whitespace, newlines, or more than 600 characters
- **THEN** the displayed detail SHALL remain identical to pinned Pi's detail and SHALL NOT be replaced by an abbreviated summary

## ADDED Requirements

### Requirement: Package syntax and help use pinned presentation for the supported subset
Recognized `a1 pi` package commands SHALL reproduce pinned Pi's diagnostic wording, severity, stream, line order, focused usage formatting, and explicit-help typography for equivalent syntax cases. Invocation text SHALL use `a1 pi`; help and usage SHALL describe only A1's supported grammar. This contextual substitution SHALL NOT rename ordinary Pi labels or add product summaries.

Pinned-runtime-update restrictions, unsupported project/profile scope, and A1 profile-preparation failures SHALL remain explicit A1-specific diagnostics. Unsupported operations SHALL remain unsupported. Syntax failures SHALL retain A1's exit status two; operational failures SHALL retain exit status one and explicit help SHALL exit zero. Numeric syntax-exit parity with standalone Pi is an intentional exception, not a wording/style exception.

#### Scenario: Install or removal source is missing
- **WHEN** `a1 pi install`, `a1 pi remove`, or `a1 pi uninstall` lacks a source
- **THEN** stderr SHALL show red `Missing install source.` or `Missing remove source.` as applicable, followed by dim `Usage: <supported invocation>` and a final newline
- **AND** uninstall SHALL use Pi's canonical remove-command diagnostic

#### Scenario: An option is genuinely unknown
- **WHEN** a supported package verb receives an option not recognized by Pi and not reserved by A1's restrictions
- **THEN** stderr SHALL show red `Unknown option <option> for "<canonical verb>".` followed by dim `Use "a1 --help" or "<supported invocation>".` in pinned line order

#### Scenario: An extra positional argument is provided
- **WHEN** a supported package invocation supplies a positional argument beyond the verb's accepted grammar
- **THEN** stderr SHALL show red `Unexpected argument <argument>.` and dim focused usage as pinned Pi does
- **AND** the command SHALL perform no package or model work

#### Scenario: Explicit command help is requested
- **WHEN** a supported package verb receives `--help` or `-h`
- **THEN** stdout SHALL use Pi's bold `Usage:` heading, section ordering, indentation, and blank rows for the applicable content, substituting supported A1 invocations
- **AND** unsupported options, examples, and claims SHALL be omitted rather than made executable or advertised
- **AND** help recognition SHALL precede ordinary syntax failure and operation dispatch as pinned Pi does

#### Scenario: Pi self-update is requested
- **WHEN** a recognized independent Pi-update form is supplied without explicit help
- **THEN** A1 SHALL retain its pinned-runtime rejection and focused supported alternatives rather than simulate a Pi self-update

### Requirement: User-scope package diagnostics preserve pinned reporting
For equivalent user-scope settings and package-manager behavior, A1 SHALL preserve pinned Pi's diagnostic sequence, warning wording, streams, emphasis, and secondary diagnostic detail in addition to the final operation outcome. Progress and child-process output SHALL retain existing transcript parity. Diagnostics SHALL NOT cause project-local settings or another profile to be read merely to imitate a message.

#### Scenario: User settings report a recoverable error
- **WHEN** equivalent user settings yield a package-command settings error
- **THEN** A1 SHALL report yellow `Warning (package command, <scope> settings): <message>` and the dim secondary stack detail when pinned Pi emits it, before the corresponding package operation output
- **AND** its continuation or failure SHALL follow the equivalent pinned user-scope result

#### Scenario: Project settings are excluded
- **WHEN** project-local settings contain packages, warnings, or trust-requiring resources
- **THEN** A1's user-scope package command SHALL NOT load them, prompt for their trust, mutate them, or synthesize project-scope diagnostics

#### Scenario: Existing success and progress transcripts remain unchanged
- **WHEN** install, remove/uninstall, list, all-package update, or single-package update succeeds
- **THEN** the established pinned success text, dim progress/paths, bold headings, indentation, and inherited child output SHALL remain unchanged
