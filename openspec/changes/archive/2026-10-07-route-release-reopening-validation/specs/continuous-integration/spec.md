## MODIFIED Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and specification changes SHALL require no product build or product test execution, but SHALL run every lightweight governance consistency check whose scanned inputs they change; OpenSpec changes SHALL also pass strict OpenSpec validation. Pull requests into `develop` SHALL require a bounded PR core consisting of typechecking, architecture and applicable governance checks, directly changed tests, reviewed path-owned test scopes, and a small current-product smoke set. They SHALL select additional rendering, startup, package, compatibility, and platform evidence only when coarse reviewed ownership marks it affected. Unknown operational inputs and changes to validation authority SHALL select complete development validation. Preview publication SHALL additionally require the complete fast tier and exact-package gates on every supported platform. A numbered development preview SHALL validate the exact package on the Windows, Linux, and macOS Node 24 lanes; Windows Node 22 coverage of every development head SHALL be provided by nightly publication and complete regression rather than by each preview. The lane set SHALL be derived from the publication mode by one reviewed repository script rather than a literal workflow matrix. Stable publication SHALL require the complete automated suite on every supported platform. The scheduled nightly workflow SHALL run one full tracked-repository documentation review and complete retained automated coverage against its authoritative `origin/develop` source before publication can succeed.

An exact post-publication release reopening MAY use a dedicated lightweight route only when policy from the pull request's exact base re-verifies the current pull-request number, base and head identities, trusted App author, branch, complete four-file diff, version-only manifest changes, patch succession, published stable Release, and release-note equivalence. That route SHALL avoid dependency installation, head-controlled impact selection, product builds, product tests, rendering, and unrelated naming or documentation scans. It SHALL still produce the protected current-head aggregate and retain independent PR Full regression selection. Missing, stale, malformed, unavailable, or negative evidence SHALL grant no reopening exemption and SHALL fall back to ordinary validation or block.

#### Scenario: Docs-only pull request
- **WHEN** every changed path is documentation, an OpenSpec artifact, a Markdown file, `LICENSE`, or `.gitignore`
- **THEN** the required development check SHALL avoid product builds and tests, run strict OpenSpec validation when applicable, and run docs-sensitive governance consistency checks

#### Scenario: Code pull request targets develop
- **WHEN** a pull request changes classified non-documentation paths without changing validation authority or an unknown operational input
- **THEN** validation SHALL run the bounded PR core and every additional scope selected by reviewed ownership
- **AND** it SHALL NOT require unrelated retained tests merely because they belong to the complete fast tier
- **AND** the required aggregate check SHALL gate the merge

#### Scenario: Validation authority or unknown input changes
- **WHEN** a pull request changes workflow selection, ownership, suite composition, aggregation authority, common build policy, or an operational path with no trustworthy owner
- **THEN** validation SHALL run complete applicable development coverage or block
- **AND** no selective result SHALL be inferred from the untrusted policy

#### Scenario: Preview candidate is built
- **WHEN** a preview is published to `next`
- **THEN** validation SHALL run the complete fast tier and exact packed-candidate gates on Windows, Linux, and macOS without requiring every stable-only scope

#### Scenario: Stable candidate is certified
- **WHEN** a version is published to `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version package bytes on Windows, Linux, and macOS before publication

#### Scenario: Scheduled nightly source is selected
- **WHEN** the nightly publication workflow resolves the authoritative `origin/develop` commit
- **THEN** one platform-independent job SHALL inspect documentation governance across every tracked policy-relevant file at that exact commit
- **AND** the retained platform validation matrix SHALL execute complete coverage without repeating the same documentation review

#### Scenario: Development preview lanes are selected
- **WHEN** a manual development publication resolves its validation matrix
- **THEN** it SHALL validate the exact package on Windows Node 24, Linux Node 24, and macOS Node 24
- **AND** nightly and stable publication SHALL keep validating on Windows Node 22 as well
- **AND** the selected lanes SHALL come from the reviewed matrix script for that mode

#### Scenario: Exact post-publication reopening is validated
- **WHEN** trusted exact-base policy verifies the current generated reopening head, its four-file content, and the corresponding published Release
- **THEN** Development validation SHALL skip generic impact analysis and unrelated product and governance lanes
- **AND** `Development validation required` SHALL accept those skips only for that exact verified head

#### Scenario: Reopening verification is not exact
- **WHEN** a reopening-shaped pull request has stale identity, another author, an incomplete or additional path, non-version manifest changes, mismatched note content, unavailable evidence, or any other classifier refusal
- **THEN** it SHALL receive no lightweight reopening exemption
- **AND** validation SHALL use the ordinary impact route or fail closed
