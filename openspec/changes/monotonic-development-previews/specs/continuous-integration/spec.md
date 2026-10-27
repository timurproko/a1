# continuous-integration Delta

## MODIFIED Requirements

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the open base version and the
first-parent commit count of the exact selected `develop` commit, as
`<base>-dev.<count>`. Because the count rises with every merge to `develop`, a later
development publication SHALL sort above every earlier one under semantic-version
precedence regardless of the order in which pull requests were opened. The unique
merged pull-request number associated with that commit and the commit itself SHALL be
recorded in the published application and installer manifests as publication metadata
rather than in the version; a stable publication SHALL record its source commit the
same way. A stable version SHALL be derived from the tag of the published source-bound
Release and stamped only while packing. Neither version SHALL be committed before
publication. Between releases the repository SHALL declare one open prerelease
version.

After verified stable publication, trusted automation SHALL create one reopening
pull request whose single commit persists the exact published note and consistently
declares the next prerelease in the application manifest, root lockfile, and installer
manifest. It SHALL use then-current compatible `develop`, change no other paths, keep
auto-merge disabled, and never merge the pull request.

#### Scenario: Several commits land in a row
- **WHEN** several commits are pushed to `develop`
- **THEN** no publication SHALL start from those pushes alone, and a later development request SHALL derive one preview from the then-authoritative source without a version commit

#### Scenario: An older pull request merges after a newer one
- **WHEN** pull request 828 merges into `develop` after pull request 835 was merged and published as `0.2.7-dev.1215`
- **THEN** the publication from the 828 merge commit SHALL be versioned with that commit's higher first-parent count, such as `0.2.7-dev.1218`, SHALL record pull request 828 in its manifests, and the `next` dist-tag SHALL move above `0.2.7-dev.1215`

#### Scenario: The publication client predicts the version
- **WHEN** the local publication client requests or verifies a development publication for a selected `develop` commit
- **THEN** it SHALL derive the same `<base>-dev.<count>` from that commit's first-parent count that the workflow stamps and SHALL report the associated pull request beside it

#### Scenario: A release is prepared for review
- **WHEN** `develop` declares `0.1.8-dev` and stable `0.1.8` is selected
- **THEN** preparation SHALL create the draft without committing either `0.1.8` or its note to `develop`

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version, a state release automation does not produce
- **THEN** development and stable publication SHALL refuse it until a reviewed PR restores one open prerelease identity

#### Scenario: A release reopens development
- **WHEN** stable `0.1.8` is published to npm from approved source declaring `0.1.8-dev`
- **THEN** trusted automation SHALL prepare one PR declaring `0.1.9-dev` and adding the exact published `docs/releases/0.1.8.md`
- **AND** development SHALL be reported reopened only after an authorized human manually merges that PR following required CI

#### Scenario: Develop advances during publication
- **WHEN** unrelated work advances `develop` before reopening is prepared
- **THEN** reopening SHALL use the then-current tip only when its package identity and open version remain compatible and the released note is absent
- **AND** it SHALL never rewrite or discard unrelated work

#### Scenario: Reopening work already exists
- **WHEN** the expected reopening branch or PR already exists
- **THEN** automation SHALL reuse it only if repository, state, base, head, single-parent commit, exact changed paths, versions, approved-note digest, and absence of auto-merge all match
- **AND** conflicting work SHALL be preserved and refused rather than overwritten
