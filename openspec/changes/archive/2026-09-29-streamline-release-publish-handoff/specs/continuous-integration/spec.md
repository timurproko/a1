## MODIFIED Requirements

### Requirement: Publication follows from what was pushed
Publication SHALL use trusted workflows whose stable source is the exact current
`origin/develop` commit. It SHALL start nightly, by explicit development dispatch,
or by one authenticated stable-staging request emitted by the waiting release command
after it observes a fresh save of the exact source-bound draft. A push, pull-request
merge, tag, draft creation, draft edit without that request, unrelated CI success, and
native GitHub Release publication alone SHALL NOT publish npm packages. The maintainer
SHALL NOT navigate to Actions or re-enter the stable version. Trusted default-branch
code SHALL treat dispatch payload fields only as candidate selectors and correlation,
and SHALL independently derive and bind the authorized human actor, authoritative
source, version, Release database identity, draft state, bounded normalized body, and
digest.

Stable preparation SHALL require an explicit target bump or `x.y.z` not below the
source's open `x.y.z-dev` core and SHALL create or exactly reuse one unpublished draft
bound to the current source. The waiting command SHALL establish a review baseline and
accept only a subsequent save of that same valid draft, including an explicit save of
unchanged generated wording. Staging SHALL require a GitHub `User` with `write`,
`maintain`, or `admin` permission, one matching saved draft, an absent target tag, and
absent target package versions unless an exact immutable partial or completed staging
run is being resumed. Apps, bots, local technical overrides, unvalidated dispatch
payloads, native publication, tag pushes, and CI success SHALL grant no npm authority.

After exact npm publication and published-pair verification, staging SHALL upload the
validated asset, fast-forward `master`, and write independently verifiable staging
evidence while the Release remains draft and the target tag remains absent. Staging
automation SHALL NOT publish the Release, create the tag independently, or prepare
reopening. The maintainer's later native publication of the unchanged source-bound
draft SHALL be the final mutation and SHALL cause GitHub to create the immutable tag at
that source. A trusted `release.published` workflow SHALL verify the exact staged and
published identities without publishing npm, then prepare reopening. Existing release
tags SHALL never be deleted, moved, or reused by automation.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** no publication SHALL start solely from that push, and a later trusted request MAY select it only while it remains authoritative

#### Scenario: Prepare a stable draft
- **WHEN** the maintainer selects stable `0.1.8` from authoritative `develop` declaring `0.1.8-dev`
- **THEN** preparation SHALL create or reuse an unpublished source-bound draft, print its editing URL exactly once, establish a fresh-save baseline, and wait without package publication, tag, public Release, pull request, or `master` movement
- **AND** it SHALL NOT ask the maintainer to visit Actions or enter `0.1.8` again

#### Scenario: Generate a Pi-style changelog draft
- **WHEN** preparation creates a new draft for stable `0.1.8`
- **THEN** its body SHALL begin with `## [0.1.8] - YYYY-MM-DD` and group applicable entries under level-three Breaking Changes, New Features, Added, Changed, and Fixed headings
- **AND** a retained version/date heading SHALL identify the expected version and a valid calendar date while the body remains human-editable

#### Scenario: A stable version is requested
- **WHEN** an authorized human saves the exact valid draft after the waiting command's baseline
- **THEN** the command SHALL emit one correlated request and trusted code SHALL independently snapshot its body, derive the version and source, stamp the version at pack time, validate exact packages, publish to npm `latest`, upload the exact asset, and fast-forward `master`
- **AND** the Release SHALL remain draft and the tag SHALL remain absent when staging reports npm ready
- **AND** native publication of that unchanged draft SHALL create the tag at the approved source without another version entry

#### Scenario: Approved publication fails before final publication
- **WHEN** validation, packaging, npm, registry propagation, published-pair, asset, `master`, receipt creation, cancellation, or another staging step fails
- **THEN** the GitHub Release SHALL remain draft and the target tag SHALL remain absent
- **AND** uncertain npm state SHALL require resuming the same immutable candidate rather than creating or moving a tag manually

#### Scenario: A draft exists without approval
- **WHEN** a draft is created, edited, viewed, passes unrelated CI, or has not been freshly saved after the command's review baseline
- **THEN** stable npm publication SHALL remain forbidden

#### Scenario: A release-review PR is manually merged
- **WHEN** a release-note pull request from the retired protocol is manually or automatically merged
- **THEN** that merge SHALL grant no stable publication authority

#### Scenario: A draft is published through GitHub prematurely
- **WHEN** an operator uses GitHub's native **Publish release** control before exact successful staging is recorded
- **THEN** that event SHALL NOT dispatch npm publication or count as npm approval
- **AND** verification SHALL fail visibly without deleting, moving, or recreating the resulting tag

#### Scenario: A stable request lacks reviewed notes
- **WHEN** the request selects a missing, duplicate, published, stale, unsaved, unsafe, mismatched, or differently digested Release, or its authenticated actor is an App, bot, or unauthorized user
- **THEN** the workflow SHALL fail before package construction

#### Scenario: A stable request names an unacceptable version
- **WHEN** the selected draft omits a valid version, names a prerelease, or names a version below the open development core
- **THEN** the workflow SHALL fail before package construction

#### Scenario: A source declares a stable version
- **WHEN** selected `develop` declares `0.1.8` instead of one open `0.1.8-dev` identity across package files
- **THEN** every publication channel SHALL refuse the source before release mutation

#### Scenario: Develop advances after draft preparation
- **WHEN** authoritative `develop` no longer equals the source bound to the edited draft
- **THEN** staging SHALL fail without silently retargeting, overwriting, or publishing that draft

#### Scenario: A release tag is pushed
- **WHEN** a `v*` tag is pushed before native final Release publication
- **THEN** no npm publication SHALL start from the push and stable staging SHALL refuse the existing tag without deleting, moving, or reusing it

#### Scenario: A tag disagrees with its commit
- **WHEN** a target tag already exists at the approved source or any other commit before native final publication
- **THEN** stable preparation and staging SHALL refuse it without deleting, moving, or reinterpreting it

#### Scenario: A version is already published
- **WHEN** either target package version already exists without exact matching immutable staging evidence
- **THEN** stable staging SHALL fail without republishing it
- **AND** a retry of the exact candidate MAY verify and skip identical immutable bytes

#### Scenario: Stable staging succeeds
- **WHEN** both exact npm packages, `latest` tags, published-pair checks, draft asset, `master`, and staging evidence match the approved snapshot
- **THEN** the command SHALL report npm ready and direct the maintainer to refresh the same Release page and use native **Publish release** without changing the body

#### Scenario: Native final publication succeeds
- **WHEN** an authorized human publishes the exact unchanged staged draft
- **THEN** GitHub SHALL create the tag at the staged source and the trusted publication-event workflow SHALL verify every identity before preparing reopening
- **AND** that event workflow SHALL NOT publish npm

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the open base version and the
unique merged pull-request number associated with the exact selected `develop` commit.
A stable version SHALL be derived from the valid source-bound draft selected by the
authenticated staging request and stamped only while packing. Neither version SHALL be
committed before publication. Between releases the repository SHALL declare one open
prerelease version.

After verified native stable publication, trusted automation SHALL create one reopening
pull request whose single commit persists the exact approved note and consistently
declares the next prerelease in the application manifest, root lockfile, and installer
manifest. It SHALL use then-current compatible `develop`, change no other paths, keep
auto-merge disabled, and never merge the pull request.

#### Scenario: Several commits land in a row
- **WHEN** several commits are pushed to `develop`
- **THEN** no publication SHALL start from those pushes alone, and a later development request SHALL derive one preview from the then-authoritative source without a version commit

#### Scenario: A release is prepared for review
- **WHEN** `develop` declares `0.1.8-dev` and stable `0.1.8` is selected
- **THEN** preparation SHALL create the draft without committing either `0.1.8` or its note to `develop`

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version, a state release automation does not produce
- **THEN** development and stable publication SHALL refuse it until a reviewed PR restores one open prerelease identity

#### Scenario: A release reopens development
- **WHEN** native publication of staged stable `0.1.8` is verified from approved source declaring `0.1.8-dev`
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
`master`, and staging-evidence gates run. Successful staging SHALL stop in that draft,
untagged state. The maintainer's later native publication of the unchanged source-bound
draft SHALL create the tag and public Release together only after those gates succeed.

Registry verification SHALL compare exact integrity and shasum for both packages and
verify the requested dist-tag. An existing identical package found while retrying the
same immutable staged candidate MAY be verified and skipped; contradictory bytes SHALL
fail. The `release.published` event SHALL verify already-completed staging and SHALL
never serve as authority to upload npm packages.

#### Scenario: npm rejects the upload
- **WHEN** npm rejects stable publication before exact registry verification completes
- **THEN** no target tag or public Release SHALL be created by automation and the draft SHALL remain inspectable

#### Scenario: npm accepts the upload
- **WHEN** npm serves both exact package versions under the requested channel tag
- **THEN** asset, `master`, and staging-evidence gates MAY proceed while the target tag remains absent

#### Scenario: npm is still processing the upload
- **WHEN** `npm publish` returned but metadata does not yet list the version
- **THEN** verification SHALL keep polling for at least ten minutes, report unsuccessful attempts, and succeed only when both exact packages and requested dist-tag are visible

#### Scenario: The registry never serves the version within the window
- **WHEN** the bounded propagation window expires without both exact packages appearing
- **THEN** staging SHALL fail while the Release remains draft and the target tag remains absent

#### Scenario: npm and completion gates succeed
- **WHEN** the registry serves both exact packages, published-pair checks pass, the asset is attached, `master` reaches the approved source, and exact staging evidence is durable
- **THEN** the command SHALL report readiness while leaving the Release draft and the target tag absent
- **AND** only the maintainer's later native publication SHALL make the Release public and create its tag

#### Scenario: Final publication API fails
- **WHEN** GitHub's native draft-publication request does not succeed
- **THEN** the Release SHALL remain draft and GitHub SHALL not create the target tag
- **AND** the exact successful npm staging evidence SHALL remain reusable without republishing packages

#### Scenario: Published identity is verified
- **WHEN** GitHub reports native publication and creates the target tag
- **THEN** the trusted event workflow SHALL verify exact Release, approved-body digest, staging run, npm pair, asset, `master`, and tag-to-source identity before reopening
- **AND** it SHALL never repair disagreement by publishing npm or moving, deleting, or recreating the tag

### Requirement: Stable release notes are generated, editable, and manually accepted before publication
The release command SHALL resolve the previous verified stable release as an ancestor
of current authoritative `origin/develop`, enumerate uniquely associated merged pull
requests in that range, and deterministically generate one bounded user-facing body
for the selected stable target. It SHALL render escaped linked pull-request titles in
stable order under feature, fix, other-change, and breaking-change groups as
applicable while excluding release housekeeping. Version identity SHALL come from the
source-bound draft Release and target metadata rather than a redundant level-one
heading in the body. Missing, ambiguous, stale, or non-ancestral evidence SHALL stop
before draft or publication mutation.

The command SHALL create or safely reuse one unpublished draft GitHub Release bound
to the exact repository, target version, and authoritative source. A maintainer may
edit its body directly in the Releases UI. The command SHALL wait for a fresh explicit
**Save draft** after its review baseline, then issue one authenticated correlated
staging request without requiring Actions navigation or repeated version input. The
requesting GitHub user SHALL be authorized, and trusted code SHALL independently bind
the draft database identity, source, derived version, normalized body, and digest.
Preparation or editing without that fresh save and request SHALL grant no authority.

Committed `docs/releases/*.md` files SHALL represent completed release history. The
stable package SHALL combine prior committed history with the current approved
snapshot. Exact npm staging SHALL leave the Release draft and untagged. After staging
reports ready, the maintainer SHALL publish the unchanged draft through GitHub's
native control. Trusted event verification SHALL require the package, public Release,
and staging snapshot to contain the same body before it prepares the manually merged
reopening PR that persists the snapshot at `docs/releases/<target>.md` with the
next-development version. Native publication SHALL NOT start npm, and draft creation,
unobserved body edits, CI success, or automatic integration SHALL NOT authorize npm
publication.

#### Scenario: Prepare a stable release
- **WHEN** the maintainer selects stable `0.1.8` from current reviewed history after the previous stable ancestor
- **THEN** the command SHALL open an editable source-bound draft GitHub Release and SHALL wait at the explicit save gate without creating a notes PR

#### Scenario: Edit generated wording
- **WHEN** the maintainer changes headings or prose in the valid draft body and clicks **Save draft** after the command's baseline
- **THEN** trusted staging SHALL validate and snapshot the edited Markdown for both package and final GitHub Release content
- **AND** an explicit save of unchanged generated wording SHALL also be accepted

#### Scenario: CI succeeds without manual merge
- **WHEN** the draft exists and is valid but no authorized command-dispatched request identifies its freshly saved exact body
- **THEN** stable npm publication SHALL remain forbidden and no package, tag, public Release, or `master` movement SHALL occur

#### Scenario: The candidate changes outside release-note paths
- **WHEN** the draft points at another source or target, is already published, is ambiguous, exceeds bounds, contains unsafe content, differs from the staged digest, or lacks exact staging evidence at final publication
- **THEN** the command or trusted workflow SHALL reject it without overwriting maintainer text, publishing npm from the native event, or repairing a tag

#### Scenario: Develop advances after review
- **WHEN** another change becomes authoritative `develop` before stable staging snapshots the draft
- **THEN** the command SHALL refuse to publish the newer source under the prior draft and SHALL require explicit preparation of a source-bound replacement

#### Scenario: Publication succeeds
- **WHEN** the exact approved source and snapshot complete npm staging and the maintainer natively publishes the unchanged draft
- **THEN** event verification SHALL prove the package and published GitHub Release contain the same approved body, and the reopening PR SHALL persist that body with the next-development version
