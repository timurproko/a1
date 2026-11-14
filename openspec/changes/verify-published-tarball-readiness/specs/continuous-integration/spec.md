## ADDED Requirements

### Requirement: Registry verification proves downloadable tarball bytes

Post-upload registry verification SHALL additionally download both exact-version manifest tarballs from credential-free HTTPS registry.npmjs.org URLs without following redirects, stream their bytes within finite request and byte limits, and compute SHA-512 integrity and SHA-1 shasum. Both digests SHALL equal the validated package digests before published-pair smoke becomes eligible. Metadata and dedicated dist-tags SHALL remain independently verified without depending on a package-wide document. Absent, unavailable, oversized, timed-out, malformed, redirected, or digest-mismatched tarballs SHALL not pass verification and SHALL exhaust only the existing bounded ingestion polling allowance.

#### Scenario: Metadata precedes tarball availability

- **WHEN** exact metadata and dist-tags match but the application tarball returns HTTP 404
- **THEN** verification SHALL remain incomplete and retry within its existing ingestion allowance
- **AND** verification SHALL succeed only after both downloadable tarballs match both validated digests

#### Scenario: Downloaded bytes differ from metadata

- **WHEN** metadata advertises the validated integrity and shasum but either downloaded tarball differs
- **THEN** registry verification SHALL fail closed unless matching bytes become available within the ingestion allowance

#### Scenario: A tarball response is unsafe or unbounded

- **WHEN** a tarball URL leaves the trusted registry or its response redirects, stalls, or exceeds the byte limit
- **THEN** verification SHALL reject that attempt without executing or unpacking the response

### Requirement: Published-installer failures retain safe diagnostic evidence

The published-installer smoke harness SHALL write structured failure evidence at its existing artifact path before deleting its isolated fixture. Evidence SHALL distinguish failure from successful activation and include the failing stage, available child outcome, and bounded sanitized npm diagnostics from a fixture-owned cache. Diagnostic collection SHALL NOT expose credentials or read unrelated npm cache logs. Success SHALL retain the exact installer transcript and exact installed-version assertions; failure SHALL retain a nonzero exit status.

#### Scenario: Installation fails after acquiring the bootstrap

- **WHEN** the published installer fails because npm cannot download the application tarball
- **THEN** the evidence artifact SHALL report the install stage and sanitized npm error detail before cleanup
- **AND** the harness SHALL still fail without claiming successful activation

#### Scenario: A successful installer transcript drifts

- **WHEN** installation exits successfully but writes an unexpected transcript
- **THEN** the harness SHALL fail and preserve failure evidence rather than relax the transcript assertion
