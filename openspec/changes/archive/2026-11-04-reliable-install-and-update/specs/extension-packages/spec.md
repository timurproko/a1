## MODIFIED Requirements

### Requirement: Package syntax and help use pinned presentation for the supported subset
Recognized preferred direct and supported `a1 pi` compatibility package commands SHALL reproduce pinned Pi's diagnostic wording, severity, stream, line order, focused usage formatting, and explicit-help typography for equivalent syntax cases. Invocation text in focused output SHALL match the namespace the user invoked; complete application help, generated usage, and documentation SHALL advertise only direct forms. Help and usage SHALL describe only A1's supported grammar. This contextual substitution SHALL NOT rename ordinary Pi labels or add product summaries.

Pinned-runtime-update restrictions, unsupported project/profile scope, and A1 profile-preparation failures SHALL remain explicit A1-specific diagnostics. Unsupported operations SHALL remain unsupported. Syntax failures SHALL retain A1's exit status two; operational failures SHALL retain exit status one and explicit help SHALL exit zero. Numeric syntax-exit parity with standalone Pi is an intentional exception, not a wording/style exception.

Direct `a1 uninstall` without a source SHALL be A1 removal as defined by `cli-uninstall` and SHALL NOT report a missing package source. `a1 pi uninstall` without a source SHALL keep Pi's canonical remove-command diagnostic.

#### Scenario: Install or removal source is missing
- **WHEN** a direct `install` or `remove` invocation, or a compatibility `install`, `remove`, or `uninstall` invocation, lacks a source
- **THEN** stderr SHALL show red `Missing install source.` or `Missing remove source.` as applicable, followed by dim `Usage: <supported invocation>` for the invoked namespace and a final newline
- **AND** compatibility uninstall SHALL use Pi's canonical remove-command diagnostic

#### Scenario: Direct uninstall has no source
- **WHEN** the user runs `a1 uninstall` without a source
- **THEN** A1 SHALL run machine removal and SHALL NOT print a package-source diagnostic

#### Scenario: An option is genuinely unknown
- **WHEN** a supported package verb receives an option not recognized by Pi and not reserved by A1's restrictions
- **THEN** stderr SHALL show red `Unknown option <option> for "<canonical verb>".` followed by dim guidance naming `a1 help` and a supported invocation in pinned line order

#### Scenario: An extra positional argument is provided
- **WHEN** a supported package invocation supplies a positional argument beyond the verb's accepted grammar
- **THEN** stderr SHALL show red `Unexpected argument <argument>.` and dim focused usage for the invoked namespace as pinned Pi does
- **AND** the command SHALL perform no package or model work

#### Scenario: Explicit command help is requested
- **WHEN** a supported direct package verb receives `--help` or `-h`
- **THEN** stdout SHALL use Pi's bold `Usage:` heading, section ordering, indentation, and blank rows for the applicable direct A1 command
- **AND** `a1 update --help` SHALL include stable, development, extension, model, and single-package update forms
- **AND** `a1 uninstall --help` SHALL include machine removal and single-package removal forms
- **AND** unsupported options, examples, and claims SHALL be omitted rather than made executable or advertised
- **AND** help recognition SHALL precede ordinary syntax failure and operation dispatch

#### Scenario: Explicit compatibility command help is requested
- **WHEN** a supported `a1 pi` package verb receives `--help` or `-h`
- **THEN** stdout SHALL retain focused `a1 pi` compatibility usage with pinned help typography and no unsupported operations

#### Scenario: Pi self-update is requested
- **WHEN** a recognized independent Pi-update form is supplied without explicit help
- **THEN** A1 SHALL retain its pinned-runtime rejection and focused supported alternatives rather than simulate a Pi self-update
