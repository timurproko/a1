## ADDED Requirements

### Requirement: Immutable release preparation avoids redundant payload passes
For a newly installed target, A1 SHALL derive release identity while writing the immutable candidate in one bounded payload pass and SHALL certify the atomically committed candidate from process-local proof produced by that pass. It MUST NOT perform a second complete destination-content read solely to certify bytes that the same uninterrupted materialization operation just hashed and wrote. An existing release lacking valid trusted certification SHALL still receive complete verification before selection.

#### Scenario: A new target is materialized
- **WHEN** no exact immutable target release exists
- **THEN** each source payload byte SHALL be read for hashing and candidate writing in one streaming pass, followed by metadata durability and atomic commit without a complete post-copy content re-read

#### Scenario: Materialization is interrupted
- **WHEN** the process exits before atomic candidate commit and certification
- **THEN** no partial candidate SHALL become selectable or gain trusted certification

#### Scenario: An exact certified release already exists
- **WHEN** durable state and the immutable manifest select an already certified exact release
- **THEN** A1 SHALL reuse it without recopying the package payload

#### Scenario: Existing release trust is incomplete
- **WHEN** an existing release has no valid certification binding its identity and content digest
- **THEN** A1 SHALL verify its complete content before approval or activation
