## MODIFIED Requirements

### Requirement: Publication follows from what was pushed
Publication SHALL use trusted workflows whose stable source is the exact current
`origin/develop` commit. It SHALL start nightly, by explicit development dispatch,
or by an explicit stable approval dispatch from **Approve stable release**; a push,
pull-request merge, tag, draft creation or edit, and native GitHub Release publication
alone SHALL NOT publish npm packages. Stable approval SHALL ask only for an exact final
version. Trusted code SHALL derive and bind the authorized human actor, authoritative
source, Release database identity, draft state, bounded normalized body, and digest.

Stable preparation SHALL require an explicit `x.y.z` not below the source's open
`x.y.z-dev` core and SHALL create or exactly reuse one unpublished draft bound to the
current source. Approval SHALL require a GitHub `User` with `write`, `maintain`, or
`admin` permission, one matching draft, absent target package versions, and an absent
target tag. Apps, bots, local `--approve`, technical-input dispatch, native publication,
tag pushes, and CI success SHALL grant no approval authority.

After exact npm publication and published-pair verification, completion SHALL upload
the validated asset and fast-forward `master` while the Release remains draft and the
target tag remains absent. Release automation SHALL NOT create the tag independently.
Publishing the approved draft with its bound `tag_name` and `target_commitish` SHALL be
the final mutation and SHALL cause GitHub to create the immutable tag at that source.
Existing release tags SHALL never be deleted, moved, or reused by automation.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** no publication SHALL start solely from that push, and a later trusted request MAY select it only while it remains authoritative

#### Scenario: Prepare a stable draft
- **WHEN** the maintainer selects stable `0.1.8` from authoritative `develop` declaring `0.1.8-dev`
- **THEN** preparation SHALL create or reuse an unpublished source-bound draft, print its editing URL exactly once, print the approval Actions URL exactly once, and stop without package publication, tag, public Release, pull request, or `master` movement

#### Scenario: Generate a Pi-style changelog draft
- **WHEN** preparation creates a new draft for stable `0.1.8`
- **THEN** its body SHALL begin with `## [0.1.8] - YYYY-MM-DD` and group applicable entries under level-three Breaking Changes, New Features, Added, Changed, and Fixed headings
- **AND** a retained version/date heading SHALL identify the expected version and a valid calendar date while the body remains human-editable

#### Scenario: A stable version is approved
- **WHEN** an authorized human runs **Approve stable release** while the exact source-bound draft remains valid and untagged
- **THEN** trusted code SHALL snapshot its body, stamp the version at pack time, validate exact packages, publish to npm `latest`, upload the exact asset, and fast-forward `master`
- **AND** the Release SHALL remain draft and the tag SHALL remain absent until final Release publication
- **AND** publishing that draft with the exact approved body SHALL be the final mutation and SHALL create the tag at the approved source

#### Scenario: Approved publication fails before final publication
- **WHEN** validation, packaging, npm, registry propagation, published-pair, asset, `master`, cancellation, or another pre-publication step fails
- **THEN** the GitHub Release SHALL remain draft and the target tag SHALL remain absent
- **AND** uncertain npm state SHALL require retrying the same immutable run rather than creating or moving a tag manually

#### Scenario: A draft exists without approval
- **WHEN** a draft is created, edited, viewed, or passes unrelated CI without the explicit authorized Actions dispatch
- **THEN** stable publication SHALL remain forbidden

#### Scenario: Native publication is used
- **WHEN** an operator uses GitHub's native **Publish release** control
- **THEN** that event SHALL NOT dispatch npm publication or count as approval

#### Scenario: Stable authority is invalid
- **WHEN** approval names a missing, duplicate, published, stale, unsafe, mismatched, or differently digested Release; an existing target tag; either existing target package; or an App, bot, or unauthorized actor
- **THEN** the workflow SHALL fail before package construction

#### Scenario: Develop advances after draft preparation
- **WHEN** authoritative `develop` no longer equals the source bound to the edited draft
- **THEN** approval SHALL fail without silently retargeting, overwriting, or publishing that draft

#### Scenario: A release tag is pushed manually
- **WHEN** a `v*` tag is pushed before final Release publication
- **THEN** no npm publication SHALL start from the push and stable approval SHALL refuse the existing tag without deleting, moving, or reusing it

#### Scenario: A stable version already exists
- **WHEN** either target package version already exists on npm
- **THEN** stable approval SHALL fail without republishing it

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the open base version and the
unique merged pull-request number associated with the exact selected `develop` commit.
A stable version SHALL be named by its Actions approval and stamped only while packing.
Neither version SHALL be committed before publication. Between releases the repository
SHALL declare one open prerelease version.

After stable completion, trusted automation SHALL create one reopening pull request
whose single commit persists the exact approved note and consistently declares the
next prerelease in the application manifest, root lockfile, and installer manifest.
It SHALL use then-current compatible `develop`, change no other paths, keep auto-merge
disabled, and never merge the pull request.

#### Scenario: Several commits land in a row
- **WHEN** several commits are pushed to `develop`
- **THEN** no publication SHALL start from those pushes alone, and a later development request SHALL derive one preview from the then-authoritative source without a version commit

#### Scenario: A release is prepared for review
- **WHEN** `develop` declares `0.1.8-dev` and stable `0.1.8` is selected
- **THEN** preparation SHALL create the draft without committing either `0.1.8` or its note to `develop`

#### Scenario: A release reopens development
- **WHEN** stable `0.1.8` completes from approved source declaring `0.1.8-dev`
- **THEN** trusted automation SHALL prepare one PR declaring `0.1.9-dev` and adding the exact approved `docs/releases/0.1.8.md`
- **AND** development SHALL be reported reopened only after an authorized human manually merges that PR following required CI

#### Scenario: Develop advances during publication
- **WHEN** unrelated work advances `develop` before reopening is prepared
- **THEN** reopening SHALL use the then-current tip only when its package identity and open version remain compatible and the released note is absent
- **AND** it SHALL never rewrite or discard unrelated work

#### Scenario: Reopening work already exists
- **WHEN** the expected reopening branch or PR already exists
- **THEN** automation SHALL reuse it only if repository, state, base, head, single-parent commit, exact changed paths, versions, approved-note digest, and absence of auto-merge all match
- **AND** conflicting work SHALL be preserved and refused rather than overwritten

### Requirement: A stable release is not visible until npm has it
Before normal stable publication, no target tag or public GitHub Release SHALL exist
for a version the registry does not serve. The Release SHALL remain draft and untagged
while npm ingestion is polled for at least ten minutes and while published-pair, asset,
and `master` gates run. Publishing the source-bound draft SHALL create the tag and
public Release together only after those gates succeed.

Registry verification SHALL compare exact integrity and shasum for both packages and
verify the requested dist-tag. An existing identical package found while retrying the
same immutable run MAY be verified and skipped; contradictory bytes SHALL fail.

#### Scenario: npm rejects or never serves the upload
- **WHEN** publication fails before exact registry verification completes
- **THEN** no target tag or public Release SHALL be created and the draft SHALL remain inspectable

#### Scenario: npm is still processing the upload
- **WHEN** `npm publish` returned but metadata does not yet list the version
- **THEN** verification SHALL keep polling for at least ten minutes, report unsuccessful attempts, and succeed only when both exact packages and requested dist-tag are visible

#### Scenario: npm and completion gates succeed
- **WHEN** the registry serves both exact packages, published-pair checks pass, the asset is attached, and `master` reaches the approved source
- **THEN** final publication SHALL make the approved Release public and create its tag at that source

#### Scenario: Final publication API fails
- **WHEN** the final draft-publication request does not succeed
- **THEN** the Release SHALL remain draft and GitHub SHALL not create the target tag
- **AND** the same immutable run MAY retry final publication without manual tag cleanup

#### Scenario: Published identity is verified
- **WHEN** the final publication request succeeds
- **THEN** the workflow SHALL verify the exact Release identity, body digest, asset, and tag-to-source identity and SHALL never repair disagreement by moving the tag
