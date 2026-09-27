## ADDED Requirements

### Requirement: Published-pair jobs use a repository-standard resolvable action pin
Every checkout in the release workflow SHALL use the same repository-established immutable action commit unless a separately reviewed coordinated upgrade changes all intended release references. A published-pair job SHALL fail policy validation before merge when it introduces a one-off checkout reference, even if that reference has the syntactic shape of a commit hash.

#### Scenario: A post-publication checkout contains a nonexistent one-off commit
- **WHEN** the published-pair job references a forty-character commit that differs from the established release-workflow checkout pin
- **THEN** focused workflow policy SHALL reject the candidate before publication
- **AND** no native installation lane SHALL depend on that unverified reference

#### Scenario: Published-pair installation begins
- **WHEN** publication and registry verification succeed for a newly numbered candidate
- **THEN** each selected native published-pair job SHALL resolve its immutable checkout action and execute the installation smoke steps
