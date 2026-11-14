## RENAMED Requirements

- FROM: `### Requirement: Package syntax and help use pinned presentation for the supported subset`
- TO: `### Requirement: Package syntax and help use pinned presentation for the versioned contract`

## MODIFIED Requirements

### Requirement: Package commands manage the A1 profile only

Preferred direct A1 install/remove/uninstall-source/list/update-package/model commands and their existing supported a1 pi aliases SHALL retain their operation meanings and selected A1 profile. The optional pi-named entry SHALL expose the pinned package/config/auth/MCP command namespaces through the same applicable owners under its approved leading-word migration, not interpret maintenance as instructions. A1 self-update SHALL remain separate from package/model refresh and SHALL never independently replace the pinned engine.

Documented project-local package mutation and configuration SHALL be supported only through explicit scope selection and resolved project trust. Global operations SHALL not consume/mutate untrusted project declarations. Configuration SHALL select resources within the chosen global or project settings without overwriting unrelated values. Both executable names SHALL have identical normal-product resource capabilities, with only approved syntax/control distinctions.

#### Scenario: Install an npm package

- **WHEN** an A1 user-scope package install is requested
- **THEN** its resources and declaration SHALL be installed under the selected A1 profile for subsequent normal-product launches

#### Scenario: Remove an installed package

- **WHEN** package remove or uninstall-source is selected
- **THEN** the matching scoped installation/declaration SHALL be removed under the same source-identity rules

#### Scenario: List installed packages

- **WHEN** list is requested
- **THEN** configured scoped packages and installed paths SHALL be reported, including an explicit empty result

#### Scenario: Update every installed package

- **WHEN** the extensions update selector is supplied
- **THEN** packages SHALL be reconciled without implicitly self-updating the product or engine

#### Scenario: Update one installed package

- **WHEN** an explicit package source is updated
- **THEN** only that scoped package SHALL be reconciled

#### Scenario: Refresh model catalogs directly

- **WHEN** direct model refresh is supplied
- **THEN** catalogs SHALL refresh without package, A1 or independent Pi update

#### Scenario: Refresh model catalogs through the Pi namespace

- **WHEN** an existing supported a1 pi model-refresh alias is supplied
- **THEN** the same A1-profile catalog operation SHALL execute

#### Scenario: Compatibility package spelling is used

- **WHEN** an accepted package operation uses a supported alternate naming/grammar entry
- **THEN** the same scoped service request and outcome SHALL result

#### Scenario: Stable and development updates remain distinct

- **WHEN** ordinary A1 self-update selects its running channel or development preview
- **THEN** existing verified product update behavior SHALL remain authoritative rather than become package work

#### Scenario: A profile is named

- **WHEN** an unsupported arbitrary profile-switching package flag is supplied
- **THEN** it SHALL fail without reaching another profile or silently borrowing configuration

#### Scenario: Explicit project scope

- **WHEN** a supported local-scope operation is requested in a project
- **THEN** trust SHALL resolve before project resources or package mutations, and only the selected project's settings SHALL change
- **AND** declining trust or malformed scope SHALL not fall back to a global mutation

### Requirement: Package operations never reach another profile

Default operations SHALL use only the selected A1 profile. Explicit project-local operations MAY use the requested project's configuration after trust. Neither path SHALL read, create or modify standalone Pi profile data implicitly, copy credentials or change another installation. Explicit public root/storage selection SHALL remain validated user selection, not permission to merge profiles.

#### Scenario: Other profiles are inspected after an install

- **WHEN** a default A1-profile install completes in a disposable fixture
- **THEN** standalone Pi settings, credentials, resources and launchers SHALL remain unchanged

#### Scenario: First install with no profile yet

- **WHEN** the selected A1 root is absent and a user-scope install is requested
- **THEN** only its required directories and intended package/settings SHALL be created

#### Scenario: Project scope preserves global settings

- **WHEN** an explicit trusted project operation completes
- **THEN** unrelated global package declarations and other projects SHALL remain unchanged

### Requirement: Package syntax and help use pinned presentation for the versioned contract

Package/config/auth/MCP syntax, aliases, errors, effects and help SHALL cover the complete documented pinned command inventory except specifically approved product/safety distinctions. Existing accepted user-scope package transcript parity SHALL remain. Wording SHALL name the invoked truthful A1 entry and actual selected scope; child-manager facts SHALL not be rewritten to mimic a different installation. Help SHALL advertise actual implemented operations, not accepted-but-ignored flags.

A1 syntax failures SHALL retain the specifically approved numeric status distinction; operational failures SHALL be nonzero, and explicit help SHALL not perform mutations. Ordinary uninstall without a source SHALL remain machine removal; pi-named uninstall without a source SHALL retain missing-source failure. Credential-printing stdout SHALL be explicitly requested, never copied into ordinary logs. No help probe SHALL start a session or unsafe extension factory solely to enumerate options.

#### Scenario: Install or removal source is missing

- **WHEN** a package verb lacks its required source
- **THEN** focused syntax guidance SHALL precede any package work

#### Scenario: Direct uninstall has no source

- **WHEN** ordinary A1 uninstall has no package source
- **THEN** existing application-removal handling SHALL remain authoritative

#### Scenario: Pi-named uninstall has no source

- **WHEN** the pi-named entry receives uninstall without a package source
- **THEN** it SHALL fail with missing-source guidance and SHALL NOT remove A1

#### Scenario: An option is genuinely unknown

- **WHEN** a command receives an unrecognized or malformed option
- **THEN** it SHALL fail with focused guidance rather than execute guessed work or submit an instruction

#### Scenario: An extra positional argument is provided

- **WHEN** a maintenance form exceeds its declared grammar
- **THEN** it SHALL fail before resource or configuration mutation

#### Scenario: Explicit command help is requested

- **WHEN** either entry receives standalone supported maintenance help
- **THEN** it SHALL describe the actual versioned syntax, scope, aliases and approved A1 differences without operation side effects

#### Scenario: Explicit compatibility command help is requested

- **WHEN** an existing a1 pi compatibility package spelling requests help
- **THEN** its focused namespace and pinned-runtime restrictions SHALL remain distinct from normal pi-named product self-update

#### Scenario: Pi self-update is requested

- **WHEN** a request would replace embedded Pi independently or bypass the verified product updater
- **THEN** it SHALL fail explicitly with supported product/package/model alternatives

## ADDED Requirements

### Requirement: Shell authentication and MCP operations use shared scoped services

Both normal-product entries SHALL implement the pinned authentication login/logout/check/credential-print and MCP add/remove/list/login/logout operations, their documented options, errors, cancellation and side effects through public integration APIs or owned implementations. They SHALL not start an interactive agent session to perform a shell maintenance operation. Secrets SHALL remain in the requested credential stream/store only; project scope SHALL require its actual trust/ownership prerequisites. Public API absence SHALL be reported as a specific blocker until an owned/public solution exists, not bypassed with private imports.

#### Scenario: Authentication readiness and credential output

- **WHEN** check or credential-print is requested against a disposable provider
- **THEN** readiness/schema/status, refresh/expiry and explicit secret output SHALL follow the pinned contract and approved A1 profile rules
- **AND** no other account SHALL be selected on failure

#### Scenario: MCP configuration and discovery

- **WHEN** a user adds/removes a scoped server or requests list/login/logout
- **THEN** validated literal argv/configuration, connection/error/timeout behavior and credential ownership SHALL match the approved pinned contract
- **AND** invalid input SHALL not execute a shell fragment or mutate another scope
