# Continuous Integration Specification

## Purpose

Defines proportionate automated validation: fast checks during development, package gates for previews, and the complete suite only for stable releases.

## Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and specification changes SHALL require no product build or product test execution, but SHALL run every lightweight governance consistency check whose scanned inputs they change; OpenSpec changes SHALL also pass strict OpenSpec validation. Pull requests into `develop` SHALL require a bounded PR core consisting of typechecking, architecture and applicable governance checks, directly changed tests, reviewed path-owned test scopes, and a small current-product smoke set. They SHALL select additional rendering, startup, package, compatibility, and platform evidence only when coarse reviewed ownership marks it affected. Unknown operational inputs and changes to validation authority SHALL select complete development validation. Preview publication SHALL additionally require the complete fast tier and exact-package gates on every supported platform. A numbered development preview SHALL validate the exact package on the Windows, Linux, and macOS Node 24 lanes; Windows Node 22 coverage of every development head SHALL be provided by nightly publication and complete regression rather than by each preview. The lane set SHALL be derived from the publication mode by one reviewed repository script rather than a literal workflow matrix. Stable publication SHALL require the complete automated suite on every supported platform. The scheduled nightly workflow SHALL run one full tracked-repository documentation review and complete retained automated coverage against its authoritative `origin/develop` source before publication can succeed.

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

### Requirement: Development validation impact is classified deterministically
The development workflow SHALL derive one machine-readable validation selection from the complete merge-base-to-head change, including additions, modifications, copies, deletions, rename sources, and rename destinations. Selection SHALL use a bounded, reviewed ownership registry that maps stable path groups, changed tests, shared support, explicit invalidators, and integration execution cadence to logical scopes and platform/runtime targets. The ownership result SHALL be understandable from path and policy records without requiring successful whole-repository source parsing. Dependency reachability MAY add scope reasons but SHALL NOT be the sole authority for a known coarse owner.

Every changed pull-request-eligible retained test SHALL select its owning scope, including tests outside the PR core. A changed exhaustive-only test SHALL be recorded as deferred from ordinary PR execution and SHALL select its focused deterministic contract coverage rather than its exhaustive owner. Changes to shared test support SHALL select the pull-request owners of every retained test that reaches the changed path through the test tree's static import graph, and SHALL record affected exhaustive owners for Full/nightly execution; when no retained test reaches the path (including support consumed only from outside the test tree) or the graph cannot be built, the change SHALL select every owner the shared rule declares and SHALL record that fallback. Reachability SHALL only narrow a shared rule's declared owner set and SHALL never remove an owner selected by its own path or changed-test rules. Unknown ownership, unavailable history, malformed policy, or classifier failure SHALL select complete applicable pull-request coverage or block rather than produce an empty selection. Typechecking, architecture, applicable naming/documentation governance, validation-policy integrity, directly changed pull-request tests, and the declared smoke contracts SHALL remain mandatory in the PR core. Manual Development validation without a complete trusted change comparison SHALL run all retained pull-request scopes; Full regression and nightly/release coverage SHALL remain complete and SHALL not be reduced by PR impact selection. An implementation-bound lifecycle association SHALL disable the documentation-only and version-only exemptions so the PR core always runs, and SHALL NOT by itself select conservative ownership; the associated pull request's unit and integration owners SHALL still be chosen by impact from its complete change.

#### Scenario: Changed source is transitively rendered
- **WHEN** a changed operational path belongs to the reviewed UI/rendering owner or a declared shared input affects rendering
- **THEN** the classifier SHALL select the applicable rendering scope and target
- **AND** it SHALL record the owner and changed paths as bounded reasons

#### Scenario: Unrelated foundation changes
- **WHEN** the complete change contains no path, test, shared support, or invalidator owned by rendering or another integration scope
- **THEN** each unrelated integration scope SHALL be explicitly unselected
- **AND** the mandatory PR core SHALL still run

#### Scenario: Reachable dependency is deleted or renamed
- **WHEN** a base or head path participating in reviewed ownership is deleted, copied, or renamed
- **THEN** classification SHALL account for both source and destination identities
- **AND** moving a path SHALL not evade its applicable owners

#### Scenario: A transitive launch dependency changes
- **WHEN** a changed path belongs to the broad reviewed launch/startup group or declared shared support used by packaged launch
- **THEN** startup and every other declared affected pull-request integration owner SHALL be selected with bounded ownership reasons

#### Scenario: Only unrelated governance tooling changes
- **WHEN** every changed operational path belongs to reviewed governance tooling outside product integration and no validation invalidator changes
- **THEN** unrelated startup, package, rendering, compatibility, and platform scopes SHALL be explicitly unselected
- **AND** applicable PR-core governance checks SHALL remain required

#### Scenario: Integration tests or shared fixtures change
- **WHEN** a retained pull-request integration test or its declared shared support changes without production changes
- **THEN** the pull-request owners of that test, and of every retained test that imports the changed support directly or through other support files, SHALL execute in current-head PR validation with the reaching tests recorded as the reason
- **AND** affected exhaustive-only owners SHALL be recorded as deferred rather than silently omitted
- **AND** unknown test ownership SHALL select complete applicable pull-request coverage or block

#### Scenario: Shared support has no known importer
- **WHEN** a changed path under a shared-support rule is reached by no retained test, including one consumed only from outside the test tree, or the import graph cannot be built
- **THEN** classification SHALL select every owner the shared rule declares
- **AND** the selection SHALL record the declared fallback as the reason

#### Scenario: Exhaustive predecessor test changes
- **WHEN** the real multi-release predecessor test or its exhaustive-only support changes
- **THEN** ordinary PR validation SHALL run the focused deterministic predecessor contracts and record the exhaustive owner as deferred
- **AND** Full regression and nightly/release SHALL continue to execute the changed exhaustive test

#### Scenario: Validation selection infrastructure changes
- **WHEN** workflow selection, ownership, suite composition, aggregation, package dependencies, or common build configuration changes
- **THEN** classification SHALL select every retained pull-request scope whose execution or interpretation may be affected
- **AND** a selector or ownership-policy change SHALL require complete retained pull-request coverage
- **AND** exhaustive-only owners SHALL remain required by their Full/nightly cadence rather than becoming ordinary PR work

#### Scenario: Classification cannot prove safety
- **WHEN** the authoritative head, complete diff, registry, or required changed path cannot be established or interpreted
- **THEN** development validation SHALL run complete applicable pull-request coverage or block
- **AND** the reason and every cadence-deferred owner SHALL be visible in machine-readable and human-readable evidence

#### Scenario: Manual development validation has no trusted comparison
- **WHEN** Development validation is manually dispatched without a complete authoritative change comparison
- **THEN** every retained pull-request scope SHALL run rather than treating an empty diff as proof of no impact
- **AND** the maintainer SHALL use Full regression when exhaustive validation is required

#### Scenario: Implementation-bound diff is documentation-shaped
- **WHEN** an implementation-bound pull request's complete diff touches only documentation, OpenSpec, or archive paths
- **THEN** the PR core SHALL run without the documentation-only exemption
- **AND** ownership selection SHALL remain `impact` with no integration owner selected merely because of the association

#### Scenario: Implementation-bound diff touches owned source
- **WHEN** an implementation-bound pull request changes a path with a reviewed coarse owner
- **THEN** selection SHALL choose that owner's tests and the integration owners its ownership links
- **AND** unrelated pull-request owners SHALL remain explicitly unselected

### Requirement: Rendering evidence is modular without losing contract coverage
Rendering selection SHALL have exactly three outcomes: `none`, `smoke`, and `full`. `smoke` SHALL exercise representative independent producer, terminal-paint, semantic parity, and logical-damage evidence for a rendered shell or component change. `full` SHALL exercise every declared deterministic rendering workload when viewport composition, stream scheduling, terminal adaptation, rendering evidence infrastructure, package/terminal identity, or impact classification changes. Each selected workload SHALL be produced at most once within one gate, and its captured result SHALL supply all applicable semantic, paint, parity, determinism, and budget assertions. Rendering validation SHALL run independently and in parallel with ordinary fast validation, while the single required aggregate check SHALL require its success whenever its tier is not `none`.

#### Scenario: Rendered shell presentation changes
- **WHEN** impact classification finds a rendered shell, status, transcript component, or theme change outside the full-critical surface
- **THEN** the rendering tier SHALL be `smoke`
- **AND** representative captured terminal-paint evidence SHALL gate the pull request

#### Scenario: Rendering infrastructure changes
- **WHEN** the viewport, damage-aware terminal, presentation scheduler, rendering workload, capture/replay harness, package identity, or classifier changes
- **THEN** the rendering tier SHALL be `full`
- **AND** every deterministic rendering workload SHALL remain required

#### Scenario: Rendering is not involved
- **WHEN** the rendering tier is `none`
- **THEN** the rendering job SHALL be skipped without weakening the ordinary fast required path
- **AND** the aggregate gate SHALL accept that skip only when it belongs to the current classifier result

#### Scenario: Equivalent matrix assertions are requested
- **WHEN** multiple rendering contracts consume the same producer/mode/workload result in one gate
- **THEN** they SHALL evaluate one captured result rather than launching an equivalent matrix again

### Requirement: Validation selection and timing are auditable
Every modular development gate SHALL emit its selected scopes, classification tier, changed inputs, bounded reasons, fallback decisions, elapsed time, and result in machine-readable evidence and a concise workflow summary. The required aggregate SHALL bind those outcomes to the current pull-request head and SHALL reject a missing, stale, unsuccessful, or unexpectedly skipped required scope.

#### Scenario: Maintainer inspects a rendering selection
- **WHEN** a pull request selects `smoke` or `full` rendering evidence
- **THEN** the workflow summary SHALL identify the changed input and classification reason that selected it

#### Scenario: Required modular result is stale
- **WHEN** a modular job result belongs to an older pull-request head or a different classifier result
- **THEN** the aggregate required check SHALL fail

### Requirement: Development merges are gated by one required check
GitHub SHALL require the development validation check for pull requests into
`develop`, which SHALL be the only branch a change can be written to directly.

`master` SHALL record the commit the npm `latest` tag serves. Only a completed
stable publication SHALL write it, by fast-forward, and it SHALL carry no check or
pull-request requirement of its own — requiring one would prevent the release from
recording itself. Release tags SHALL be protected from deletion and movement and
SHALL likewise carry no check, because a tag is cut from a commit that has already
been validated. Publication SHALL NOT serve as the first automated validation of a
change.

#### Scenario: Required check has not passed
- **WHEN** a pull request targets `develop` and its required check is absent or unsuccessful
- **THEN** GitHub SHALL prevent the merge

#### Scenario: A stable version is published
- **WHEN** publication to npm `latest` completes
- **THEN** `master` SHALL be fast-forwarded to the published commit
- **AND** a preview publication SHALL leave `master` unchanged

#### Scenario: A release tag is targeted
- **WHEN** a deletion or force update of a `v*` tag is attempted
- **THEN** GitHub SHALL refuse it

### Requirement: Preview and stable artifacts are published from verified bytes
A published package SHALL be packed once for its final version, validated in that
exact form, and uploaded without rebuilding. The publisher SHALL verify the package
digest before uploading it, and SHALL verify that what it uploads is what the
validation ran against.

#### Scenario: Published input differs
- **WHEN** the tarball offered for publication differs by digest from the package that was validated
- **THEN** publication SHALL fail before contacting npm

#### Scenario: The publisher is inspected
- **WHEN** the publishing job is read
- **THEN** it SHALL contain no dependency installation, build, or packing step

### Requirement: The complete suite remains available on demand
The complete non-physical automated suite SHALL remain runnable locally (`npm run test:full`) and through manual workflow dispatch, so a maintainer can widen validation when a change feels risky, and SHALL run on a nightly schedule against the current `develop` tip so exhaustive owners and enforced budgets are exercised every day independent of publication. Routine development SHALL NOT require it.

#### Scenario: Maintainer requests full validation
- **WHEN** the maintainer dispatches the full-regression workflow or runs the full tier locally
- **THEN** every non-physical scope SHALL execute and report per-scope timing and outcomes

#### Scenario: Nightly schedule fires
- **WHEN** the scheduled Full regression runs
- **THEN** it SHALL validate the current `develop` tip with every pull-request and exhaustive owner and enforced startup budgets
- **AND** its failure SHALL be visible as a workflow failure without changing publication authority

### Requirement: Publication follows from what was pushed
Publication SHALL use one workflow whose source is the exact current `origin/develop`
commit. It SHALL start nightly or by explicit dispatch; a push or tag alone SHALL NOT
publish. A manual request SHALL provide the intended channel and exact source SHA and
SHALL fail if that SHA is no longer authoritative `develop`.

Nightly and explicit development publication SHALL derive one immutable preview
version from the unique merged pull request associated with the selected source and
publish or verify npm `next`. Stable publication SHALL require a final version and
explicit stable dispatch. No other workflow SHALL publish.

Every record of a stable release — its tag, GitHub Release, and `master` — SHALL be
written only after the registry serves the verified package. A release tag SHALL NOT
be deleted or moved. An existing development version MAY be a manual no-op or a
nightly exact-registry verification; an existing stable version SHALL be refused.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** no publication SHALL start solely from that push, and the next nightly or explicit development request MAY select it only while it remains authoritative

#### Scenario: A release tag is pushed
- **WHEN** a commit declaring a stable version is pushed to `develop`
- **THEN** no publication SHALL start solely from the push or a tag, and explicit stable publication SHALL write its tag and GitHub Release only after npm verification

#### Scenario: A tag disagrees with its commit
- **WHEN** a release fails at any point before the registry serves the package
- **THEN** no tag, GitHub Release, or moved branch SHALL exist for that version

#### Scenario: A version is already published
- **WHEN** the resolved version already exists on the registry
- **THEN** manual development MAY finish before package work, nightly SHALL verify the immutable registry bytes, and stable publication SHALL fail without republishing

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the open base version and the
unique merged pull-request number associated with the exact selected `develop`
commit. It SHALL NOT be committed. Between releases the repository SHALL declare one
open prerelease version. Merging commits SHALL NOT itself promise or trigger one
preview per commit.

A commit declaring a stable version SHALL be eligible only for explicit stable
publication, so preview automation never interprets it as a development candidate.

#### Scenario: Several commits land in a row
- **WHEN** three commits are pushed to `develop`
- **THEN** no publication SHALL start from the pushes alone, and a later development request SHALL derive one preview from the then-authoritative source's merged pull request without a version commit

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version
- **THEN** development publication SHALL refuse it and only explicit stable publication MAY publish it to `latest`

### Requirement: A stable release is not visible until npm has it
No tag, GitHub Release, or release-naming branch update SHALL exist for a version
the registry does not serve. The publication SHALL write them in that order after
the registry has accepted and been verified to serve the exact published bytes.

#### Scenario: npm rejects the upload
- **WHEN** publication fails
- **THEN** nothing SHALL be visible for that version anywhere, and the run SHALL fail

#### Scenario: npm accepts the upload
- **WHEN** the registry serves the published version
- **THEN** the tag, the GitHub Release, and the release-naming branch SHALL be written

### Requirement: A failing pull request is the next piece of work
The result of a pull request's validation SHALL be read before any further work
begins, and a pull request whose validation is failing SHALL be repaired before new
work starts. Work SHALL NOT be stacked on a change whose validation is failing,
because the repair then costs a merge with the base branch and a second full run.
A failure that this change did not cause SHALL be reported with its evidence and
still addressed, since it fails every pull request behind it. Validation SHALL be
reported as what it said rather than as what it was expected to say.

#### Scenario: Validation fails
- **WHEN** a pull request's required check reports a failure
- **THEN** repairing it SHALL be the next task
- **AND** no further change SHALL be started on top of it until it passes

#### Scenario: The failure came from elsewhere
- **WHEN** a failure is not caused by the change under review
- **THEN** it SHALL be reported with the evidence for that
- **AND** it SHALL still be addressed before other work continues

#### Scenario: The result has not been read
- **WHEN** validation has been triggered and its result has not been read
- **THEN** the change SHALL NOT be described as passing

### Requirement: Documentation-only changes merge on their own
Repository automation SHALL arrange automatic squash integration only for non-draft, non-implementation-bound PRs when every changed and renamed-from path is under `openspec/**`, under `docs/**`, or is exactly the root `README.md`. An implementation association or introduction of a new active change SHALL hold the PR for manual integration even with an OpenSpec-only diff; malformed or unavailable lifecycle data SHALL fail closed. Removing a marker SHALL NOT bypass the authoritative base/head check. Ordinary docs, standalone existing-change revisions, and verified archive follow-ups SHALL retain eligibility. It MAY arm an eligible pull request while required validation is pending because protected `develop` remains the merge gate. After successful validation for the current head, automation SHALL reconcile that head when GitHub reports `clean` or positively mergeable `unstable` state through a normal protected squash-merge request enforcing that expected head SHA. A specifically recognized unstable-status rejection when arming SHALL be handled by bounded re-evaluation or an explicit deferred outcome, not by creating another failed check solely for that state transition.

An eligible pull request SHALL pass documentation-sensitive governance and, when OpenSpec is touched, strict OpenSpec validation. A pull request containing any other path SHALL remain open for local maintainer validation and manual merge, including behavior-preserving refactors and mixed documentation-plus-code changes. CI success SHALL NOT substitute for local maintainer acceptance of code. Failed validation or successful validation for an older head SHALL NOT authorize direct integration. State recovery SHALL NOT change required checks, grant bypass authority, or turn unrelated API failures into success.

#### Scenario: Complete diff is auto-merge eligible
- **WHEN** a non-draft, non-implementation-bound PR has every changed and renamed-from path under `openspec/**`, under `docs/**`, or exactly at the root `README.md`
- **THEN** automation SHALL arrange squash integration behind the required validation gate

#### Scenario: Maintained docs change is validated
- **WHEN** an eligible pull request changes a path under `docs/**`
- **THEN** CI SHALL run documentation-sensitive governance before the required validation gate succeeds

#### Scenario: OpenSpec change is validated
- **WHEN** an eligible pull request changes a path under `openspec/**`
- **THEN** CI SHALL run strict OpenSpec validation before the required validation gate succeeds

#### Scenario: Eligible pull request is still validating
- **WHEN** an eligible current head is blocked only because required validation is pending
- **THEN** automation MAY arm squash auto-merge and SHALL rely on protected `develop` to prevent premature integration

#### Scenario: Eligible pull request is already clean
- **WHEN** successful required validation belongs to the current head and GitHub already reports that head clean
- **THEN** automation SHALL reconcile squash integration using that exact head SHA

#### Scenario: Successful validation belongs to an older head
- **WHEN** the pull request head differs from the head that passed required validation
- **THEN** automation SHALL NOT directly merge the current head

#### Scenario: Behavior-preserving code changed
- **WHEN** a pull request contains any changed or renamed-from path outside the auto-merge allowlist
- **THEN** it SHALL NOT be armed to merge automatically even if behavior is intended to remain unchanged
- **AND** it SHALL wait for local maintainer acceptance and manual merge

#### Scenario: Documentation and code are mixed
- **WHEN** a pull request contains both an allowed documentation path and a path outside the allowlist
- **THEN** the entire pull request SHALL follow the manual code path

#### Scenario: Validation passes while the policy check is unstable
- **WHEN** an eligible current head passes required validation while a pending or failed non-required check leaves GitHub reporting a positively mergeable unstable head
- **THEN** automation SHALL attempt normal protected squash integration with the validated head SHA
- **AND** a failed attempt to arm auto-merge SHALL NOT be a prerequisite to that attempt

#### Scenario: Arming reports an unstable-state transition
- **WHEN** GitHub specifically rejects arming because the pull request is in unstable status
- **THEN** automation SHALL refresh state and re-evaluate its eligibility and current-head validation within a bounded recovery attempt
- **AND** if safe integration cannot yet be established it SHALL report deferral without claiming the pull request merged or that required validation passed

#### Scenario: Real validation or API failure remains visible
- **WHEN** required validation fails or the automation encounters an authentication, permission, transport, malformed-response, or unrelated API error
- **THEN** that failure SHALL remain visible and SHALL NOT be reclassified as a successful unstable-state recovery

### Requirement: Resource-sensitive fast validation is partitioned deterministically
The fast validation tier SHALL declare tests whose subprocess, temporary-repository, storage, or release-cohort workloads require protection from shared runner contention. Every declared resource-sensitive test SHALL be excluded from the parallel remainder, SHALL execute exactly once in one non-file-parallel partition process on an isolated runner under the partition's explicit hang bound, and SHALL retain all of its semantic assertions. The hang bound SHALL be the same explicit thirty-second bound the other explicit fast-tier invocations declare; it SHALL be recorded in the plan evidence as explicit, and it SHALL NOT serve as a performance assertion. Pull-request validation and exact-package validation SHALL derive the same partition from the same authoritative suite configuration on every platform. The ordinary remainder and resource-sensitive partition SHALL report separate planned commands, elapsed time, outcomes, and available subprocess or fixture timing. A failed assertion, process error, missing or duplicate test owner, or hang-bound expiry SHALL fail the tier without automatically retrying the test. Per-test durations SHALL remain available as evidence, and the focused timing report SHALL name every test body above five seconds so a slowdown is visible without failing the pull request on shared-runner variance.

#### Scenario: Fast tier is planned
- **WHEN** validation expands the fast tier
- **THEN** every resource-sensitive test SHALL be absent from the parallel remainder and present exactly once in the single non-file-parallel partition invocation under the explicit hang bound
- **AND** every other retained fast test SHALL remain owned by the ordinary remainder or another explicit scope

#### Scenario: Pull request and package use the fast tier
- **WHEN** pull-request validation and exact-package validation select the fast tier
- **THEN** both SHALL use the same authoritative resource-sensitive partition and the same explicit hang bound

#### Scenario: Resource-sensitive assertion fails
- **WHEN** a resource-sensitive test reports an assertion failure, process error, or exceeds the explicit hang bound
- **THEN** validation SHALL fail without automatically rerunning that test or converting the result to success

#### Scenario: Isolated test remains slow
- **WHEN** repeated focused evidence lists a resource-sensitive test body above five seconds
- **THEN** its fixture or subprocess workload SHALL be diagnosed and optimized
- **AND** the hang bound SHALL NOT be raised to hide it

#### Scenario: Validation evidence is inspected
- **WHEN** a maintainer reads the validation plan or outcomes
- **THEN** the ordinary remainder and resource-sensitive partition SHALL have distinct identifiers, commands, durations, and results
- **AND** available subprocess or fixture timing SHALL identify whether resource setup, child execution, or assertions consumed the elapsed time

### Requirement: Pull requests enforce brand-neutral names and classified environment contracts
Development validation SHALL inspect the complete head contents of every added, modified, copied, and renamed-to first-party naming-policy input in the complete pull-request merge-base-to-head change. The policy SHALL cover owned production code, entry points, tooling, tests, and native source, plus environment definitions and uses in owned configuration and workflows. It SHALL enforce the product-identity naming and environment-classification requirements without changing supported external product identity. Only declared public/integration boundary uses and exact unresolved exposure-review entries SHALL receive external-name exceptions; a confirmed private key SHALL NOT gain an exemption for legacy compatibility. Runtime aliases, dual reads/writes, or fallback key definitions that restore obsolete private spellings SHALL fail governance.

Identifier findings SHALL be derived from language-aware source inspection, not a raw text search. Coverage SHALL include private identifiers, local aliases, binding patterns, type members, quoted or statically known computed member names, and equivalent supported native-language forms. Environment-key inspection SHALL include string-valued definitions and supported accesses, not only identifier tokens. Comments, ordinary user-facing strings, and source snippets that exist solely as test data SHALL NOT be misreported as declarations; actual environment-contract fixtures SHALL be classified explicitly. External dependencies, immutable vendored sources, build output, and other worktrees SHALL be excluded through explicit ownership rules rather than whole first-party subtrees being silently ignored.

#### Scenario: A new file introduces a branded constant
- **WHEN** a pull request adds a first-party source file with a forbidden internal constant name
- **THEN** the naming check SHALL fail and report the path, line, name, and violated rule

#### Scenario: An unchanged line in a modified file violates the policy
- **WHEN** a pull request changes a file containing a forbidden internal name outside the edited lines
- **THEN** governance SHALL inspect the entire selected file and report that violation

#### Scenario: A file is copied or renamed into policy scope
- **WHEN** a pull request copies or renames a file into a first-party policy location
- **THEN** governance SHALL inspect the complete destination content at the current head
- **AND** the source path SHALL participate in ownership and full-scan invalidation decisions

#### Scenario: A file is removed or renamed out of scope
- **WHEN** a selected source path no longer exists at the head
- **THEN** governance SHALL account for its deletion or rename without attempting to parse missing content or inventing a successful scan
- **AND** a rename to another supported owned-source location SHALL NOT evade inspection

#### Scenario: A private environment key is hidden in a string
- **WHEN** a selected input defines or uses a product-branded private environment key as an active string-valued setting or fallback
- **THEN** environment-contract governance SHALL reject it even when the surrounding variable names are neutral or it is labeled as a legacy compatibility exception

#### Scenario: A private legacy exception is proposed
- **WHEN** a pull request changes classification data to permit an obsolete private key for runtime use
- **THEN** the exception validation and full policy audit SHALL fail
- **AND** explicit negative-test data containing the obsolete spelling SHALL NOT make it a supported setting

#### Scenario: A fixture describes forbidden code
- **WHEN** a governance test contains a source snippet as test data rather than as an executable declaration in that file
- **THEN** the naming check SHALL not count the snippet as the test file's own declarations
- **AND** regression tests SHALL independently prove that inspecting the snippet as source detects its violations

#### Scenario: A public identity value is retained
- **WHEN** a selected input uses a declared public setting or serialization spelling at its approved boundary
- **THEN** governance SHALL accept that boundary use without permitting similarly spelled internal declarations elsewhere

### Requirement: Naming validation is fail-closed and bound to the current change
Naming validation SHALL use the authoritative PR head and its resolved merge base, with rename and deletion information intact. A missing base, unavailable diff, unreadable selected file, invalid policy input, unsupported owned-source syntax, or inspection failure SHALL prevent a successful changed-file naming result; it SHALL NOT silently fall back to an empty diff or skip an unclassified input. A successfully completed conservative full scan SHALL be allowed when changed-file classification is insufficient and the authoritative head is known.

Changes to the naming policy, environment classifications, exception definitions, source-ownership rules, parser dependencies, or naming-check selection and integration SHALL require a full tracked-source naming/environment audit and policy regression tests. Full validation SHALL retain the full audit. An ordinary PR with unchanged policy SHALL be eligible for the changed-file audit without a duplicate complete audit solely for this rule. Documentation-only changes outside naming-policy inputs SHALL retain the existing no-product-build/no-product-test path; documentation that is explicitly an input to exception validation SHALL receive the applicable lightweight consistency check.

The required development aggregate SHALL require the applicable naming result and bind it to the current head. Evidence SHALL identify the base and head, changed or full mode, selected and inspected inputs, explicit exclusions, escalation reasons, findings, elapsed time, and result. A missing, stale, failed, or unexpectedly skipped required naming result SHALL block integration.

#### Scenario: The PR base cannot be resolved
- **WHEN** naming selection cannot establish the authoritative merge base and no complete authoritative-head audit succeeds
- **THEN** naming validation SHALL fail rather than inspect no files and report success

#### Scenario: A parser cannot inspect a selected input
- **WHEN** a selected owned source cannot be read or analyzed under the supported syntax policy
- **THEN** validation SHALL fail with an actionable input-specific diagnostic

#### Scenario: A policy change affects unchanged source
- **WHEN** a pull request changes identifier matching, environment exceptions, ownership rules, or check selection
- **THEN** validation SHALL run the policy regression tests and the full tracked-source audit
- **AND** violations in otherwise unchanged files SHALL block integration

#### Scenario: A prior head passed naming validation
- **WHEN** the pull-request head changes after the naming result was produced
- **THEN** the required aggregate SHALL reject that stale result for the new head

#### Scenario: A required naming job is skipped
- **WHEN** the current selection requires naming validation but its result is absent or skipped
- **THEN** the required aggregate SHALL fail

#### Scenario: Only non-policy documentation changes
- **WHEN** every changed path is documentation or specification material outside naming-policy inputs
- **THEN** naming validation SHALL record an explicit not-applicable result or selection-authorized skip without product execution
- **AND** existing documentation-sensitive and strict OpenSpec gates SHALL remain required as applicable

### Requirement: macOS release validation proves packaged supervision and containment
Pull-request and exact-package validation for changes affecting supervision, containment, release startup, or native guardian artifacts SHALL exercise the supported macOS path rather than accepting build success alone. Exact-package preview publication SHALL remain ineligible unless the macOS package starts a correlated supervisor, launches the packaged public command through certified Darwin containment, completes representative resume and cleanup behavior, and reports actionable startup diagnostics on injected failure.

#### Scenario: macOS supervisor starts from exact packaged bytes
- **WHEN** the macOS exact-package lane materializes and launches a preview candidate
- **THEN** the selected supervisor SHALL publish verified endpoint metadata for the candidate and the packaged public launch chain SHALL reach input-ready state

#### Scenario: Darwin native containment regresses
- **WHEN** process identity, process-group creation, foreground transfer, parent-loss cleanup, artifact support, or guardian integrity fails on macOS
- **THEN** a required pull-request or exact-package macOS check SHALL fail before publication

#### Scenario: Detached supervisor fails before listening
- **WHEN** a macOS validation fixture injects a pre-listen supervisor failure
- **THEN** validation SHALL observe the bounded correlated diagnostic rather than waiting for an undifferentiated endpoint timeout

#### Scenario: Development publication is accepted
- **WHEN** `npm run develop` selects a new authoritative candidate after this correction merges
- **THEN** Windows Node 22/24, Linux Node 24, and macOS Node 24 exact-package lanes, the npm publisher, the aggregate result, and registry `next` verification SHALL all succeed for the same package bytes

### Requirement: Exact packages carry a spawn-capable native process guardian
The exact packed package SHALL record each bundled platform's native process guardian with an executable file mode, regardless of which operating system packed it, so that posix installation and immutable release materialization preserve a spawn-eligible helper. Packing SHALL derive each guardian entry's executability from the per-platform guardian build manifest packed beside the binary, not from the pack host's filesystem permissions. Exact package surface validation SHALL assert every packed native guardian entry is executable on every lane that runs it, including lanes whose host cannot represent posix permissions. Executable mode SHALL NOT override the manifest's independent supported/unsupported capability decision.

#### Scenario: Packed on a host without posix permissions
- **WHEN** the exact package is packed on a host whose filesystem cannot record posix executable permission
- **THEN** the packed native process guardian entries for every bundled platform SHALL still carry an executable mode

#### Scenario: Executability is bound to certified build bytes
- **WHEN** packing records a native process guardian entry as executable
- **THEN** the entry bytes SHALL match the digest declared by that platform's guardian build manifest packed beside the binary

#### Scenario: Surface validation proves executability on any host
- **WHEN** exact package surface validation runs on any platform lane, including Windows
- **THEN** it SHALL fail unless every packed native process guardian entry is recorded executable

#### Scenario: Posix materialization preserves guardian executability
- **WHEN** the exact package is installed and materialized on Linux or Darwin
- **THEN** every bundled native guardian file SHALL remain executable
- **AND** a guardian whose manifest declares supported capability SHALL be spawn-eligible for the packaged public launch chain

#### Scenario: Executable artifact remains unsupported
- **WHEN** a bundled guardian has executable mode but its certified manifest declares the current platform unsupported
- **THEN** launch SHALL continue to reject that containment provider until a separate platform-capability change certifies it

### Requirement: Patch releases preserve prerelease-aware version semantics
Invoking `npm run release -- patch` SHALL promote a valid current prerelease version to its stable core without incrementing that core, and SHALL increment the patch number when the current version is already stable. The command SHALL report the source version, selected stable target, and prospective next development version before mutations.

The release command SHALL continue to require a target. It SHALL reject a missing target, invalid version, unknown target, invalid exact target, or extra positional arguments with actionable errors and no version, branch, PR, or publication mutation. No separate no-argument release mode SHALL be introduced. The existing `minor`, `major`, and exact stable-version commands SHALL remain available, with minor/major core-version arithmetic unchanged by this patch fix. Existing stable registry versions and tags SHALL remain protected against reuse or movement.

#### Scenario: Release the current development version with patch
- **WHEN** the repository declares `0.1.8-dev` and the maintainer invokes `npm run release -- patch`
- **THEN** the selected stable target SHALL be `0.1.8`
- **AND** the prospective development reopening SHALL be `0.1.9-dev`
- **AND** the command SHALL NOT select `0.1.9` as the stable target

#### Scenario: Promote a numbered development version
- **WHEN** the current version is `0.1.8-dev.123` and the target is `patch`
- **THEN** the stable target SHALL be `0.1.8`, not a version incremented from the preview number

#### Scenario: Increment an already-stable patch
- **WHEN** the repository declares stable `0.1.8` and the maintainer invokes `npm run release -- patch`
- **THEN** the selected stable target SHALL be `0.1.9`
- **AND** its prospective development reopening SHALL be `0.1.10-dev`

#### Scenario: Promote another valid prerelease with patch
- **WHEN** the current version is `0.1.8-rc.1` and the target is `patch`
- **THEN** the stable target SHALL be `0.1.8`, following the same prerelease-aware patch rule

#### Scenario: Retain minor and major targets
- **WHEN** the current version is `0.1.8-dev` and the maintainer explicitly supplies `minor` or `major`
- **THEN** the stable target SHALL be `0.2.0` or `1.0.0` respectively

#### Scenario: Request an exact stable target
- **WHEN** the maintainer supplies the valid exact target `0.4.0`
- **THEN** the selected stable target SHALL be `0.4.0` and its prospective development reopening SHALL be `0.4.1-dev`
- **AND** the existing registry and tag guards SHALL still apply

#### Scenario: Omit the required target
- **WHEN** the maintainer invokes `npm run release` without a target
- **THEN** the command SHALL display usage requiring `patch`, `minor`, `major`, or an exact stable version
- **AND** it SHALL make no release mutations

### Requirement: Release version pull requests require manual integration
Both the stable-version PR and the next-development-version PR SHALL remain subject to required validation, local maintainer acceptance, and manual merge. The release command SHALL NOT enable auto-merge, directly merge either PR, relax branch protection, or treat CI success alone as permission to advance. It SHALL display each PR's URL and phase-specific manual steps and verify its actual merge before continuing beyond that gate.

Version preparation SHALL preserve the caller's checkout, staged/unstaged work, and unrelated worktrees. Version edits SHALL affect only this package's manifest and root lockfile version fields, not dependency versions. Pending or failed phase work SHALL remain identifiable without destructive resets or silent replacement of a conflicting branch/PR.

#### Scenario: Prepare the stable version PR
- **WHEN** the command prepares `0.1.8` from `0.1.8-dev`
- **THEN** it SHALL present the stable-version PR for manual validation and merge
- **AND** publication SHALL not begin merely because the PR exists or its CI passed

#### Scenario: A version PR is not merged
- **WHEN** either version PR is closed without merging, cannot be verified, or remains pending beyond the bounded wait
- **THEN** the command SHALL stop that phase and report its PR identity and incomplete state
- **AND** it SHALL neither merge automatically nor claim that develop has advanced

#### Scenario: Local work appears while a release waits
- **WHEN** the caller's checkout changes while release orchestration is awaiting a PR or publication
- **THEN** those changes SHALL be preserved
- **AND** any unsafe local synchronization SHALL be declined with the authoritative remote state reported

### Requirement: Development reopens only after verified stable publication
The command SHALL prepare the next patch development version only after successful publication of the selected stable version is confirmed through the existing exact-source publication authority. It SHALL verify that the stable PR's merged version and SHA correspond to the authoritative publication source, and SHALL fail rather than silently substitute a newer source SHA.

For released `x.y.z`, the reopening target SHALL be `x.y.(z+1)-dev`. Reopening SHALL be reported complete only after its separate PR is manually merged and the remote version is verified. Failed or uncertain publication SHALL not trigger reopening. Successful publication followed by incomplete reopening SHALL be reported as two distinct outcomes without republishing or altering immutable release records.

#### Scenario: Finish the current release cycle
- **WHEN** the stable `0.1.8` PR is manually merged and exact-source publication is confirmed successful
- **THEN** the command SHALL prepare a separate PR for `0.1.9-dev`
- **AND** it SHALL report develop reopened at `0.1.9-dev` only after that PR is manually merged and verified

#### Scenario: Publication fails or remains uncertain
- **WHEN** stable publication fails, times out, or cannot be confirmed
- **THEN** no next-development-version PR SHALL be created by that attempt
- **AND** the command SHALL provide inspection guidance without claiming release success

#### Scenario: The publication source becomes stale
- **WHEN** authoritative develop no longer matches the selected stable PR's verified publication source
- **THEN** the command SHALL stop with the mismatch
- **AND** it SHALL not publish a newly selected SHA without a fresh deliberate release decision

#### Scenario: Reopening is incomplete after publication
- **WHEN** `0.1.8` is confirmed published but the `0.1.9-dev` PR fails or is not merged
- **THEN** the command SHALL distinguish published `0.1.8` from pending development reopening
- **AND** it SHALL not republish `0.1.8`, move its tag, or falsely report develop at `0.1.9-dev`

### Requirement: Maintainer release documentation matches the command
The README release section, release runbook, and command help SHALL document `npm run release -- patch` with distinct prerelease and already-stable examples, retain accurate minor/major/exact-version examples, and explain both manual version-PR gates. They SHALL state that a target is required and SHALL NOT advertise a no-argument release mode. They SHALL state that `0.1.9-dev` follows confirmed `0.1.8` publication and manual reopening, not initial invocation. They SHALL not describe version PRs as self-merging. These documentation changes SHALL accompany the implemented behavior.

#### Scenario: Follow the README example
- **WHEN** a maintainer reads the release instructions for a checkout declaring `0.1.8-dev`
- **THEN** the primary example SHALL be `npm run release -- patch` selecting stable `0.1.8`
- **AND** a separate example SHALL show the same command selecting `0.1.9` only when its input is already-stable `0.1.8`
- **AND** the instructions SHALL identify manual merge requirements and publication-before-reopening order

#### Scenario: Read recovery guidance
- **WHEN** a release stops before publication or after publication but before reopening
- **THEN** the runbook SHALL distinguish those phases and their safe inspection/recovery steps
- **AND** it SHALL not recommend republishing an existing stable version or using `patch` from stable develop to retry the same release

### Requirement: Independent development partitions do not serialize feedback
Development validation SHALL schedule the mandatory PR core and each selected integration partition independently after its actual prerequisites. Resource-sensitive files selected by ownership SHALL remain non-file-parallel on an isolated runner, with the same authoritative membership and the same explicit hang bound used by complete validation. No selected test SHALL be duplicated between partitions on the same platform/runtime merely because job boundaries changed. Cross-platform and cross-runtime executions SHALL remain distinct evidence where selected.

The single protected-branch aggregate SHALL require the PR core and every scope selected for the current head and selection identity. It SHALL reject missing, failed, cancelled, stale, malformed, or unexpectedly skipped selected results. A skipped integration scope SHALL be acceptable only when the current trustworthy selection explicitly excludes it. Independent jobs SHALL not share mutable application state or owned process trees. The modular job matrix SHALL be derived from the trusted selection by one reviewed repository script that declares every Development modular job; an entry the selection leaves inactive SHALL NOT be scheduled, each scheduled job SHALL still resolve its own owners from the uploaded selection, and the aggregate SHALL still require successful evidence for every selected owner.

#### Scenario: Fast work and resume checks are selected
- **WHEN** a code PR requires the PR core, a resource-sensitive owner, and package resume integration
- **THEN** the resource-sensitive and resume jobs SHALL not depend on completion of unrelated core tests solely for sequencing
- **AND** all selected results SHALL be required before the aggregate succeeds

#### Scenario: Serialization would be replaced by contention
- **WHEN** a resource-sensitive partition is selected alongside ordinary validation
- **THEN** it SHALL execute on an isolated runner rather than concurrently on the ordinary runner
- **AND** it SHALL retain one-file-at-a-time execution and all existing assertions under the partition's explicit hang bound

#### Scenario: A selected partition is skipped
- **WHEN** the current selection requires a core or integration partition but that partition is missing, cancelled, or skipped
- **THEN** the aggregate SHALL fail even if every completed partition passed

#### Scenario: Evidence belongs to another selection
- **WHEN** a result belongs to another head, workflow run, or selection identity
- **THEN** it SHALL NOT satisfy the current aggregate

#### Scenario: Finalized Implementation candidate completes validation
- **WHEN** a finalized implementation-bound pull request in the Implementation phase runs ordinary exact-head validation
- **THEN** selected product validation and finalized-delivery validation SHALL both execute for that candidate
- **AND** the stable protected aggregate SHALL succeed in the same workflow run only after every selected result and the finalized delivery record succeed
- **AND** no Acceptance phase edit or second workflow run SHALL be required before manual review and merge

#### Scenario: Manual review rejects the implementation
- **WHEN** manual review finds a defect after the protected aggregate succeeds
- **THEN** the pull request SHALL remain open in Implementation while fixes are pushed
- **AND** the changed exact head SHALL run normal validation again before merge

#### Scenario: Complete validation is requested
- **WHEN** conservative PR classification, Full regression, nightly, preview, or stable validation requests complete retained coverage
- **THEN** every retained fast and applicable integration owner SHALL execute under its declared isolation and platform/runtime contract

#### Scenario: Inactive matrix entries are not scheduled
- **WHEN** the trusted selection activates only some declared modular jobs
- **THEN** the workflow SHALL schedule only the active entries and record the unscheduled ones in the run summary
- **AND** the aggregate SHALL fail when an active entry produced no successful evidence

### Requirement: Reused validation setup retains exact identity
Validation SHALL avoid repeated successful builds and candidate packing within a job when the consuming scopes use unchanged source, platform, architecture, toolchain, dependencies, and build inputs. Reuse SHALL depend on verified prerequisite evidence and present artifacts rather than an unchecked environment flag. Missing or incompatible setup evidence SHALL cause fresh preparation or an explicit failure before tests, never successful validation with stale artifacts.

Persistent caches SHALL be limited to integrity-checked dependency downloads and compatible native compiler intermediates, with validation of resulting artifacts after restoration. Clean-install gates SHALL still install exact candidate bytes into fresh private prefixes. Mutable installed fixtures, active releases, certification state, launch compile caches, and prior performance results SHALL not be restored as substitutes for current-head execution. Publication SHALL retain its existing pack-once and exact-byte authority.

#### Scenario: Installation already built the job's candidate
- **WHEN** dependency installation successfully builds the unchanged selected source and records compatible prerequisite evidence
- **THEN** later scopes in that job SHALL consume that build without rebuilding it

#### Scenario: A ready marker is stale or forged
- **WHEN** setup is marked ready but its inputs differ or required artifacts cannot be verified
- **THEN** validation SHALL rebuild or fail before consuming those artifacts

#### Scenario: A package download cache is warm
- **WHEN** a clean-install scenario can reuse cached dependency tarballs
- **THEN** it SHALL verify their integrity and install into a new isolated prefix
- **AND** first-attempt startup evidence SHALL not be replaced by warmed fixture or prior-run evidence

#### Scenario: A native guardian compiler cache is warm
- **WHEN** a publication guardian build can reuse cached compiler intermediates for the same toolchain and dependency lockfile
- **THEN** the locked release build SHALL still run and its emitted artifact identity SHALL still be recorded
- **AND** a changed guardian source or lockfile SHALL rebuild the affected units rather than reuse a stale binary

### Requirement: Feedback optimization is measured without weakening coverage
Development validation SHALL report selection time, available queue time, setup/build/pack time, repository gate time, per-scope outcomes, and aggregate elapsed time separately. Package fixtures SHALL report bounded phase timings for installation, materialization, certification/warmup, launch, shutdown, and cleanup where executed, including unsuccessful phases. Evidence SHALL identify head, selection, runner, Node version, candidate digest where applicable, cache state, build/pack counts, and test ownership. Reporting SHALL not expose credentials or raw user content.

Acceptance SHALL compare representative unrelated, startup-sensitive, and conservative-full selections against recorded baselines, preserving all measured attempts and distinguishing cached and uncached setup. When hosted scheduling prevents the complete planned observation set, acceptance MAY proceed only through an explicit maintainer known-gap disposition that identifies every missing class/control; missing samples SHALL remain unperformed, SHALL NOT support a speedup or completed-performance claim, and SHALL NOT be converted into passing evidence or automatic completed-change archival. Structural ownership and failure-path checks SHALL be mandatory. Wall-clock improvement targets SHALL be reported as achieved or unmet, not enforced by increasing product budgets, shortening representative workloads, hiding failed attempts, or retrying until green.

#### Scenario: A startup job is slow
- **WHEN** a startup job takes substantially longer than its measured command launches
- **THEN** the evidence SHALL distinguish install and fixture phases from actual launch latency and cleanup

#### Scenario: An optimized partition fails
- **WHEN** a scope fails before the remaining scopes execute
- **THEN** completed and failing phase evidence SHALL be retained and unfinished work SHALL remain explicitly incomplete

#### Scenario: A speedup is claimed
- **WHEN** the maintainer reviews optimization acceptance
- **THEN** evidence SHALL include before/after elapsed and runner-cost measurements, selection and ownership differences, cache conditions, and all failed attempts
- **AND** the complete non-PR suite SHALL retain every prior semantic scenario and supported platform/runtime owner

### Requirement: Same-head failed-job reruns reuse only authoritative successes
Development validation SHALL support GitHub's failed-jobs-only rerun for an unchanged workflow run, head, and selection. A successful selected job from an earlier attempt of that same run MAY satisfy the rerun aggregate when that job was not rerun, while every job executed in the current attempt SHALL use its current-attempt result. Evidence names SHALL remain distinct across attempts. A different head, run, workflow selection, or changed ownership identity SHALL invalidate reuse. Semantic test failures SHALL never be retried automatically or converted to success, and every failed attempt SHALL remain visible.

#### Scenario: One job has an infrastructure failure
- **WHEN** one selected job fails for an infrastructure reason while other selected jobs pass and the maintainer requests failed-jobs-only rerun without changing the head
- **THEN** only the failed job and its dependent aggregate MAY execute again
- **AND** the aggregate SHALL accept unchanged exact-head successes from earlier attempts of that run after the rerun succeeds

#### Scenario: A rerun job fails again
- **WHEN** a selected job executes in the current attempt and remains unsuccessful
- **THEN** its older success or another run SHALL NOT override the current-attempt failure
- **AND** the aggregate SHALL fail

#### Scenario: The pull-request head or selection changes
- **WHEN** a new commit, workflow authority, owner registry, or selection identity differs from the recorded success
- **THEN** prior-attempt evidence SHALL NOT satisfy the new validation
- **AND** every scope selected for the new identity SHALL run again

#### Scenario: A semantic assertion fails
- **WHEN** a test reports a product or policy assertion failure
- **THEN** validation SHALL retain the failure without automatically rerunning the test
- **AND** a maintainer-requested same-head rerun SHALL remain distinguishable from first-attempt success

### Requirement: Ordinary validation evidence is proportionate to its authority
Checkout-bound type, architecture, governance, unit, and smoke jobs SHALL bind their outcome to the authoritative head, run, selection, and logical scope without reproducing package-level content receipts. Exact build, candidate, installation, and digest receipts SHALL remain mandatory where a gate consumes emitted or packed artifacts or supplies publication authority. The aggregate SHALL rely on trusted Actions job conclusions plus only the additional evidence needed to establish selected scope identity and exact-artifact contracts.

#### Scenario: Checkout-bound unit job completes
- **WHEN** a PR-core job reads only the checked-out source and produces no artifact consumed as a publication candidate
- **THEN** its result SHALL be bound to the current head and selected scope without hashing the complete build or package surface

#### Scenario: Exact package is consumed
- **WHEN** startup, package, update, compatibility, preview, or release validation consumes emitted or packed candidate bytes
- **THEN** compatible build and package identity SHALL be verified before those bytes satisfy the gate
- **AND** ordinary checkout-bound success SHALL NOT substitute for exact-package evidence

#### Scenario: Aggregate evidence is unavailable or contradictory
- **WHEN** trusted job status, scope identity, or required exact-artifact evidence is missing, stale, ambiguous, or contradictory
- **THEN** the required aggregate SHALL fail rather than infer success

### Requirement: Integration owners declare pull-request or exhaustive cadence
Every retained integration owner SHALL declare exactly one execution cadence: `pull-request` or `exhaustive`. Ordinary `pull_request` and manual Development validation SHALL schedule only pull-request owners. Impact selection SHALL choose affected pull-request owners, while conservative selection SHALL choose all pull-request owners. Exhaustive owners SHALL remain mandatory in manual and scheduled Full regression and nightly/stable release validation and SHALL never satisfy, replace, or be inferred from focused PR coverage. An owner whose assertion is wall-clock timing on shared runners SHALL be exhaustive, with its deterministic contracts covered by pull-request owners.

A malformed, missing, or unknown cadence declaration SHALL block selection rather than default an exhaustive owner into or out of PR validation. Selection evidence SHALL list selected pull-request owners and deferred exhaustive owners separately. The protected aggregate SHALL require every selected PR owner and SHALL neither wait for nor accept evidence from a cadence-deferred owner.

#### Scenario: Validation-authority pull request is conservative
- **WHEN** a pull request changes Development workflow or selector authority
- **THEN** trusted classification SHALL select every pull-request owner and record every exhaustive owner as cadence-deferred
- **AND** the protected aggregate SHALL complete without scheduling an exhaustive owner

#### Scenario: Ordinary release implementation changes
- **WHEN** a pull request changes package or update production code
- **THEN** affected pull-request package, update, startup, and deterministic predecessor contracts SHALL run
- **AND** the real multi-release predecessor owner and the update timing owner SHALL remain deferred to Full/nightly validation

#### Scenario: Full regression is requested
- **WHEN** a maintainer dispatches Full regression
- **THEN** all pull-request and exhaustive owners SHALL execute with their retained assertions and targets

#### Scenario: Nightly or stable validation runs
- **WHEN** nightly or stable release validation expands complete coverage
- **THEN** all exhaustive owners SHALL execute against the selected exact package
- **AND** a failed exhaustive owner SHALL block that workflow's publication authority

#### Scenario: Cadence policy is malformed
- **WHEN** an integration owner omits cadence or declares an unsupported value
- **THEN** selection and aggregation SHALL fail closed
- **AND** no omitted owner SHALL be interpreted as safely deferred

### Requirement: Pull-request latency targets are measured by owner and scope
Development validation SHALL report setup, per-scope invocation, selected-job execution, aggregate processing, and runner execution critical-path durations without counting pre-runner queue delay as test execution. Acceptance evidence for this change SHALL include representative owned-path and conservative validation runs. The ordinary PR target SHALL be no more than eight minutes of runner execution critical path and no more than five minutes for any individual PR-required scope invocation.

These targets SHALL be evaluated by removing or optimizing inappropriate work, not by increasing timeouts, shrinking representative workloads, caching mutable installed state, suppressing assertions, or retrying failures. Hosted variance MAY be reported, but an observation above either target SHALL remain an unmet result and SHALL not support a completed speedup claim.

#### Scenario: Conservative PR timing is inspected
- **WHEN** a validation-authority change selects complete pull-request coverage
- **THEN** evidence SHALL identify every owner and scope on the critical path with separate setup and invocation durations
- **AND** it SHALL report the eight-minute and five-minute targets as met or unmet

#### Scenario: Exhaustive work is deferred
- **WHEN** the published-predecessor owner is excluded from an ordinary PR by cadence
- **THEN** evidence SHALL identify cadence deferral rather than classify the owner as unrelated, skipped unexpectedly, or passed

#### Scenario: A PR-required scope exceeds its target
- **WHEN** an individual selected PR scope takes more than five minutes or the runner execution critical path exceeds eight minutes
- **THEN** acceptance evidence SHALL report the target as unmet
- **AND** validation SHALL retain the original assertions, timeout, first-attempt outcome, and failure visibility

### Requirement: Publication lanes deduplicate exact-package installation
When one preview, nightly, or stable publication platform/runtime lane selects multiple exact-package owners that consume the same candidate and require the same clean installed package, validation SHALL reuse a compatible downloaded candidate receipt without repacking and SHALL prepare that immutable installation once for the lane. The lane-local receipt SHALL bind the downloaded candidate to the same exact build receipt used by validation. Each selected owner SHALL retain a distinct outcome, its declared assertions, and all applicable platform/runtime coverage. Validation SHALL record the preparation identity, count, duration, separate installation, proxy-synchronization, and installed-identity durations, candidate digest, and consuming owners, and SHALL fail closed if any consumer cannot prove it used that exact preparation.

Reusable preparation SHALL remain scoped to one lane and one exact candidate. It SHALL NOT cross platform, architecture, Node runtime, workflow run, run attempt, candidate digest, or installation-policy identity boundaries. Failure or cancellation of shared preparation SHALL fail every dependent owner and SHALL block publication without reporting an owner as passed or skipped.

#### Scenario: Package contracts and startup share one lane
- **WHEN** one publication lane selects package-contract and first-attempt startup owners for the same exact candidate
- **THEN** the lane SHALL reuse compatible downloaded candidate evidence and perform exactly one clean installed-package preparation for those owners
- **AND** startup SHALL execute immediately after preparation and before package-contract workload
- **AND** each owner SHALL execute once and report a separate result

#### Scenario: Downloaded candidate receipt is compatible
- **WHEN** a lane receives exact candidate bytes and source identity with a package receipt bound to that lane's exact build receipt
- **THEN** validation SHALL accept the existing candidate without invoking lane-local packing
- **AND** contradictory candidate, source, or build evidence SHALL remain fail-closed

#### Scenario: Preparation identity differs
- **WHEN** selected consumers differ by candidate digest, platform, architecture, Node runtime, run attempt, or installation-policy identity
- **THEN** validation SHALL NOT reuse the installed package across that boundary
- **AND** every required lane SHALL retain its own verified preparation

#### Scenario: Shared preparation fails
- **WHEN** the lane's exact-package installation fails, is cancelled, or produces missing or contradictory identity evidence
- **THEN** every dependent owner SHALL remain unsuccessful
- **AND** publication SHALL be blocked before npm is contacted

#### Scenario: Publication timing is inspected
- **WHEN** validation evidence for a lane selecting multiple exact-package consumers is reviewed
- **THEN** it SHALL show one preparation count and duration plus each consuming owner's independent duration and outcome
- **AND** a repeated equivalent clean install SHALL fail the structural regression contract rather than being hidden in aggregate elapsed time

#### Scenario: Preparation cost is attributed
- **WHEN** a lane records its shared exact-package preparation
- **THEN** the receipt and evidence SHALL show the installation, proxy-synchronization, and installed-identity durations separately
- **AND** the total SHALL remain the single preparation duration already reported

### Requirement: Startup budget enforcement is declared per channel
Validation SHALL select startup budget enforcement through the `STARTUP_BUDGET_ENFORCEMENT` contract. The value `fail` SHALL enforce the declared budgets by failing the gate on an overrun. The value `record` SHALL retain every measurement, record each overrun as evidence and as a run annotation, and allow the run to succeed. An absent or unrecognized value SHALL mean `fail`.

Development publication and ordinary pull-request validation SHALL run in `record` mode. Nightly publication, stable publication, and complete regression SHALL run in `fail` mode, and the complete regression workflow SHALL state its mode explicitly rather than rely on the default. No mode SHALL reduce the measured profiles or launch kinds, retry a measurement, or suppress a launch that never became input-ready.

The startup performance evidence SHALL name the enforcement mode it was produced under and SHALL list every recorded violation with its profile, launch kind, measured elapsed time, applicable budget, and dominant phases. Publication lanes SHALL upload that evidence with their platform outcomes and SHALL summarize each measurement, its budget, and its status in the run summary.

#### Scenario: A development preview lane records an overrun
- **WHEN** a publication lane resolves the development channel and an exact packaged launch exceeds its budget
- **THEN** the lane SHALL receive `record`, annotate the run, upload the violation with its platform outcomes, and succeed

#### Scenario: A publication lane enforces an overrun
- **WHEN** a publication lane resolves the nightly or stable channel and the same launch exceeds the same budget
- **THEN** the lane SHALL receive `fail` and block publication with the dominant measured phases

#### Scenario: A pull request measures startup
- **WHEN** the pull-request startup owner runs on a shared runner
- **THEN** it SHALL measure every declared scenario in `record` mode and SHALL NOT fail the required aggregate on a timing overrun alone

#### Scenario: The contract is unset
- **WHEN** the exact-package startup gate runs with no enforcement variable, an empty value, or an unrecognized value
- **THEN** it SHALL enforce the budgets

### Requirement: Shared exact-package installation is prepared and handed off explicitly
A publication or complete regression lane SHALL be able to perform its one shared exact-package installation as a separate command from the command that runs the owners consuming it, so the workflow can change runner state between them. The preparing command SHALL verify the existing build receipt when a verified install-time build is declared, SHALL verify the package receipt for the exact candidate, SHALL perform exactly one installation for the planned consumers, SHALL write one bounded handoff naming its schema, consumers, prepared paths, measured duration, and verified receipt, and SHALL run no other planned command.

The consuming command SHALL verify a supplied handoff against the same lane, candidate digest, installation policy, declared consumers, and installed bytes before any owner executes, and SHALL record the preparation as a verified shared preparation carrying the duration the preparing command measured. A malformed handoff, a handoff that contradicts the plan, and a handoff that fails verification SHALL each produce one failed preparation outcome and SHALL NOT cause a second installation. The consuming command SHALL retain ownership of removing the prepared installation at the end of the run whether it prepared that installation or received it. When no handoff is supplied, preparation SHALL remain lazy and unchanged.

#### Scenario: A lane prepares before changing runner state
- **WHEN** a publication or complete regression lane prepares the exact package as its own step
- **THEN** exactly one installation SHALL occur for the planned consumers
- **AND** the lane SHALL be free to change runner protection state before the consuming command starts

#### Scenario: A consuming command receives a valid handoff
- **WHEN** the consuming command verifies a handoff for its own lane, candidate, policy, and consumers
- **THEN** it SHALL record one verified shared preparation with the measured preparation duration
- **AND** every consuming owner SHALL still verify the installation around its own invocation and report a separate result

#### Scenario: A handoff is malformed or unverifiable
- **WHEN** a supplied handoff is malformed, contradicts the plan, or fails exact-package verification
- **THEN** the run SHALL record one failed preparation outcome and stop before any owner executes
- **AND** it SHALL NOT perform a second installation

#### Scenario: No handoff is supplied
- **WHEN** a local run or ordinary pull-request validation runs the tier without a handoff
- **THEN** preparation SHALL remain lazy, bound to the first consuming invocation, and otherwise unchanged

### Requirement: Publication failures are reported readably
When an explicitly dispatched publication fails, the maintainer command that requested it SHALL report the failed workflow job names and the failure messages those jobs recorded, bounded to a short list, and SHALL exit non-zero with that report rather than an uncaught process stack trace. It SHALL print the workflow run identifier and its URL as soon as the run is known so the maintainer can follow progress. A publication that succeeds SHALL keep its existing output.

The publication workflow final result job SHALL, when the selected outcome was not reached, write to the run summary the failed jobs and, for each validation lane whose outcome evidence was uploaded, the invocations that exited non-zero and any recorded startup budget violations. The summary SHALL remain informational; the existing outcome requirement SHALL keep deciding the job result.

#### Scenario: A validation lane fails during a requested publication
- **WHEN** the maintainer publication command observes the workflow run finish unsuccessfully
- **THEN** the command SHALL print the failed job names and their recorded failure messages and exit non-zero without a stack trace

#### Scenario: The run is created
- **WHEN** the publication command identifies the workflow run responsible for the requested version
- **THEN** it SHALL print the run identifier and URL before waiting on it

#### Scenario: The result job summarizes a failed run
- **WHEN** the publication result job runs after a package, validation, or publish job failed
- **THEN** its summary SHALL list the failed jobs and the non-zero validation invocations from uploaded lane evidence
- **AND** the job SHALL still fail through the unchanged outcome requirement

#### Scenario: Publication succeeds
- **WHEN** the run completes successfully
- **THEN** the command output and result summary SHALL be unchanged apart from the earlier run URL line
