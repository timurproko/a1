## ADDED Requirements

### Requirement: Read-only published-pair reproduction

Development validation SHALL provide an explicitly selected diagnostic route that exercises an existing immutable application and installer version on hosted Windows without publishing packages or changing public npm tags. It SHALL capture bounded sanitized detached recovery-worker errors and exit information without changing the installed predecessor's package bytes. Diagnostic success SHALL NOT substitute for finalized-candidate validation or authorize promotion.

#### Scenario: A published recovery worker exits without a result

- **WHEN** an explicitly requested existing-version reproduction loses its recovery worker before result publication
- **THEN** the diagnostic artifact SHALL retain available worker stderr, uncaught errors, and exit status alongside the primary smoke failure

#### Scenario: Normal development validation is requested

- **WHEN** no published-pair diagnostic version is supplied
- **THEN** ordinary validation routing SHALL remain unchanged and no registry reproduction SHALL run

#### Scenario: Diagnostic reproduction fails

- **WHEN** a read-only published-pair reproduction fails
- **THEN** neither package publishing nor public-tag promotion SHALL occur and failure evidence SHALL still be uploaded

## MODIFIED Requirements

### Requirement: Published installer smoke replacement budget

The published-installer smoke harness SHALL bound the predecessor update command to five minutes on every platform. On timeout it SHALL retain failure evidence and settle fixture-owned descendants before removal, without trusting a partially installed target or relaxing promotion assertions. It SHALL print each command's phase before waiting and its outcome and elapsed time afterward. Existing acquisition, fresh-installation, and launch command budgets SHALL remain unchanged.

#### Scenario: Windows predecessor update runs long

- **WHEN** a published-predecessor update has not finished within five minutes
- **THEN** the harness SHALL fail that stage, collect bounded diagnostics, and settle the fixture-owned process tree
- **AND** promotion SHALL remain blocked even if target files already exist

#### Scenario: A phase is running without child output

- **WHEN** the harness starts a smoke command that buffers its child output
- **THEN** it SHALL print the smoke phase before awaiting that command
- **AND** it SHALL print the outcome and duration when the command returns

#### Scenario: Other platforms and stages keep their budget

- **WHEN** the smoke runs acquisition, fresh installation, or a launch command
- **THEN** that command SHALL retain its existing deadline

### Requirement: User-facing npm tags follow native candidate smoke

Every new application and installer version SHALL first be published under a staging tag that is neither next nor latest. Only after all selected native lanes successfully exercise the exact published candidate's installation, predecessor upgrade, and non-interactive launch SHALL trusted publication promote both packages to the selected user-facing channel. The real predecessor update SHALL be attempted. A Windows transaction whose authenticated known legacy recovery worker exits unsuccessfully from its owner.json heartbeat sharing failure MAY instead complete its upgrade through the exact published installer, only after all fixture-owned writers settle. The failed direct attempt and successful installer recovery SHALL remain distinct in evidence; a generic timeout, unknown worker, different error, failed settlement, or failed recovery SHALL NOT qualify. Stable completion SHALL depend on promotion. An existing immutable staged version SHALL remain eligible for smoke and promotion recovery without rebuilding or republishing. Missing, failed, cancelled, or unexpectedly skipped smoke evidence SHALL block public-tag mutation. Promotion SHALL use the existing trusted OIDC identity and fail closed when dist-tag authority is unavailable.

#### Scenario: Published smoke fails

- **WHEN** a newly uploaded candidate fails any required native installation, declared upgrade path, or launch check
- **THEN** next and latest SHALL remain unchanged and stable completion SHALL remain blocked

#### Scenario: Staged bytes already exist

- **WHEN** a prior run uploaded the exact candidate but did not finish smoke or promotion
- **THEN** recovery SHALL reuse the immutable bytes and repeat required smoke before attempting promotion

#### Scenario: Stable candidate is checked before latest changes

- **WHEN** latest still names the previous release
- **THEN** native staging smoke SHALL select the exact candidate explicitly rather than install the previous latest release

#### Scenario: Promotion partially succeeds

- **WHEN** one package tag moves but promotion of the other fails
- **THEN** completion SHALL fail and a retry SHALL reconcile exact existing tags without republishing either package

#### Scenario: A known immutable updater loses its heartbeat owner

- **WHEN** the authenticated legacy Windows worker exits from the observed owner.json sharing failure before publishing a result
- **THEN** the harness SHALL retain the failed direct attempt and settle its fixture-owned processes before using the exact published installer on the same prefix and data
- **AND** only successful installer transcript, activation, manifest, and launch checks SHALL establish installer-recovery success, never direct-update success
