## ADDED Requirements

### Requirement: Dependency certifications use a dedicated managed directory
A1 SHALL write new dependency-layer certification records to `<dataDir>/dependency-certifications/<layerId>.json`, where `<layerId>` retains the existing `dependencies-<32-hex>` identity. Record placement SHALL NOT change the layer's full content digest, certification schema, platform policy, immutable payload path, or release identity. New writers SHALL NOT create root-level dependency certification records.

#### Scenario: A dependency layer is certified for the first time
- **WHEN** A1 certifies a dependency layer and the dedicated directory does not yet exist
- **THEN** A1 SHALL create the managed directory and publish the record at `dependency-certifications/<layerId>.json`
- **AND** no root-level `dependency-layer-certification-<layerId>.json` SHALL be created by that writer

#### Scenario: A previously certified layer is reused
- **WHEN** a valid record already exists in the dedicated directory for the expected layer identity and current platform
- **THEN** A1 SHALL reuse it without a payload-wide verification pass solely to resolve its storage location

### Requirement: Legacy dependency certification migration preserves validation authority
A1 SHALL continue to recognize a legacy `<dataDir>/dependency-layer-certification-<layerId>.json` record when the canonical record is absent. Legacy records SHALL pass the same identity, manifest, and platform validation required for canonical records before reuse or migration. Successful migration SHALL publish a complete canonical record before any eligible legacy copy is removed and SHALL NOT require payload-wide reads solely for relocation. Migration SHALL be retryable after interruption or concurrent attempts. A present but invalid canonical record SHALL NOT be bypassed by falling back to a legacy record.

#### Scenario: A valid legacy-only installation is used
- **WHEN** A1 reuses a layer with a valid legacy record and no canonical record
- **THEN** A1 SHALL publish the validated certification in the dedicated directory without changing the layer identity or reading all payload bytes
- **AND** the legacy copy SHALL remain until no protected consumer needs it

#### Scenario: Legacy evidence does not match the layer
- **WHEN** the legacy record has an incorrect schema, layer identity, content digest, or platform evidence
- **THEN** relocation SHALL NOT turn that record into trusted certification
- **AND** A1 SHALL fail safely or use its existing complete-verification recovery before executing uncertified content

#### Scenario: Canonical and legacy records disagree
- **WHEN** a canonical record exists but fails validation and a legacy record is also present
- **THEN** A1 SHALL reject the canonical evidence or recover through complete verification rather than silently selecting the legacy record

#### Scenario: Migration is interrupted or performed concurrently
- **WHEN** migration stops before publication or another process publishes the same canonical record
- **THEN** a later attempt SHALL recover using validated complete evidence without accepting a partial file or deleting the only valid legacy record

### Requirement: Certification relocation preserves retained cohort restart evidence
A1 SHALL keep legacy certification files unchanged while a protected retained release, live cohort, or active transaction still requires their legacy paths, including paths embedded in durable restart seals. New restart seals SHALL bind canonical certification paths after successful canonical publication. Moving records SHALL NOT invalidate otherwise valid protected legacy restart evidence or bypass identity, path, binding, and platform checks.

#### Scenario: An older retained release references the legacy file
- **WHEN** a dependency record is migrated while a retained rollback release or live cohort still requires its legacy path
- **THEN** A1 SHALL preserve the legacy file and its recorded evidence
- **AND** that release SHALL remain restartable under its existing certification rules

#### Scenario: A new release receives a restart seal
- **WHEN** A1 seals a release whose dependency certification has been published in the dedicated directory
- **THEN** the seal SHALL reference `dependency-certifications/<layerId>.json`
- **AND** a later restart with unchanged evidence SHALL not need payload-wide verification solely because of the directory change

### Requirement: Dependency certification cleanup handles both layouts safely
A1 SHALL include the dedicated directory and legacy root-level records in bounded, retryable managed cleanup. It SHALL preserve records required by retained releases, live cohorts, or active transactions, and SHALL eventually remove obsolete legacy copies once valid canonical evidence exists and no protected consumer requires the legacy path. Once a dependency layer is safely removed, cleanup SHALL remove its obsolete records from both layouts. Unknown files and paths outside managed storage SHALL remain untouched.

#### Scenario: A migrated legacy copy is no longer needed
- **WHEN** valid canonical certification exists and no protected release, cohort, or transaction requires the legacy record
- **THEN** bounded cleanup SHALL remove the obsolete root-level copy without removing the canonical record

#### Scenario: An unreferenced dependency layer is collected
- **WHEN** A1 safely removes an unreferenced dependency layer with records in both layouts
- **THEN** cleanup SHALL remove both obsolete records, retrying transient failures without blocking interactive startup

#### Scenario: Cleanup encounters an absent directory or unrelated entry
- **WHEN** the dedicated directory is absent or contains unknown files, subdirectories, or symbolic links
- **THEN** cleanup SHALL tolerate absence and SHALL NOT treat unrelated entries or link targets as owned certification records

#### Scenario: A managed certification path escapes the data root
- **WHEN** a certification directory or record resolves through a link outside managed storage
- **THEN** A1 SHALL refuse to trust, migrate, overwrite, or delete that external target as managed certification evidence
