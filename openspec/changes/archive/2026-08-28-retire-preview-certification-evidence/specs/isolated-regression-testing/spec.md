## MODIFIED Requirements

### Requirement: Packaged candidates validate exact publication artifacts
Every publication SHALL pack once, SHALL bind the packed bytes to the source commit
and the version they carry by digest, and SHALL upload exactly those bytes. The
digest SHALL be re-checked after validation and before upload, so what was tested
and what is published are known to be the same bytes.

What separates a preview from a release SHALL remain observable where it is
consulted: the npm tag the version is published under. A preview SHALL NOT move
`latest`. A declared certification status SHALL NOT be required of a publication,
because nothing consumes one.

#### Scenario: Candidate bytes change
- **WHEN** the package digest differs between validation and publication
- **THEN** publication SHALL fail before contacting the registry

#### Scenario: Uncertified preview is packed
- **WHEN** a preview is packed and published
- **THEN** it SHALL be published under the `next` tag and SHALL leave `latest` where it was
