## ADDED Requirements

### Requirement: Exact installer artifacts are self-contained before publication

The exact installer tarball SHALL explicitly include every local module imported by its executable, including the shared palette and capsule-verification helper, while retaining dependency-free runtime metadata and the minimal declared payload. Validation SHALL install that exact tarball offline into an isolated global prefix and invoke its public launcher, require the current exact help contract including the existing explicit repair option, and reject removed options. A missing required helper SHALL block validation and publication before npm staging.

#### Scenario: The complete installer artifact is validated
- **WHEN** validation installs the exact installer tarball into an isolated global prefix
- **THEN** the public launcher SHALL run without missing local imports and return the current exact help text
- **AND** the manifest SHALL remain dependency-free and removed options SHALL remain rejected

#### Scenario: A required repair helper is omitted
- **WHEN** the packed installer artifact omits bin/repair-capsule.js
- **THEN** exact-package validation SHALL fail rather than accept an executable whose local import cannot resolve
- **AND** publication SHALL remain blocked before npm staging
