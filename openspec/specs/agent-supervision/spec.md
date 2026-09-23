# Agent Supervision Specification

## Purpose

Defines immutable release cohorts, negotiated control contracts, durable process generations, and exclusive foreground-terminal lease supervision.

## Requirements

### Requirement: Live A1 processes use one immutable release cohort
Every live A1 bootstrap, supervisor, and A1-owned runtime process SHALL execute from retained
immutable release content with package-derived identity. Installing a candidate SHALL NOT
overwrite files used by a live cohort or connect incompatible releases.

Each process SHALL stay on the cohort it started on for its whole life. More than one cohort MAY
be live at once, and each live cohort SHALL be addressable on its own endpoint identity so two
cohorts never contend for one. A new launch SHALL follow the newest eligible release between the
verified active reference and the verified package installation used by that invocation. Ordinary
launch SHALL NOT replace a newer active reference with an older installed candidate; an explicit
update or rollback MAY atomically select its exact verified target.

#### Scenario: Launch encounters an older live supervisor
- **WHEN** the mutable command entry encounters a verified older live A1 cohort and a newer eligible installed release
- **THEN** A1 SHALL atomically select and launch the newer release for the new instance
- **AND** the older cohort SHALL continue serving its existing instances without interruption

#### Scenario: Invocation comes from an older installation
- **WHEN** an ordinary launch from an older compatible package installation observes a newer verified active release
- **THEN** A1 SHALL launch the newer active release
- **AND** SHALL NOT move the active reference backward

#### Scenario: Safe cohort activation
- **WHEN** a verified newer candidate becomes eligible for new launches
- **THEN** A1 SHALL atomically activate the candidate and establish or reuse only its matching verified supervisor
- **AND** SHALL avoid duplicate ownership of any endpoint identity

#### Scenario: A launch arrives while a superseded cohort is still working
- **WHEN** a new launch starts while an older cohort still has live instances
- **THEN** the launch SHALL start on the active cohort
- **AND** the older cohort SHALL keep serving the instances it already has

#### Scenario: Concurrent activation changes during launch
- **WHEN** the active reference changes after release selection but before a new launch instance is admitted
- **THEN** A1 SHALL revalidate ownership and converge through a bounded internal reselection
- **AND** SHALL preserve the invocation's profile and explicit session selection

### Requirement: Control compatibility is negotiated by required features
Control peers SHALL negotiate stable envelope identity and required features before accepting commands. Release and contract identities SHALL derive from installed metadata and generated protocol artifacts rather than a manually maintained global protocol number.

#### Scenario: Additive peer differences
- **WHEN** peers differ only by unknown optional fields, events, or features
- **THEN** they SHALL negotiate shared required features and safely ignore unsupported additive information

#### Scenario: Required feature is unavailable
- **WHEN** either peer requires a feature the other does not advertise
- **THEN** no application command SHALL be accepted and release coordination SHALL select a matching cohort or fail safely

### Requirement: Immediate package replacement is ownership-safe and atomic
Stable and preview updates SHALL coordinate npm installation, immutable materialization,
certification, stale-generation reconciliation, active-reference commit, and rollback through
one durable transaction. The npm tag SHALL select only the exact target and SHALL NOT weaken
ownership or rollback semantics.

Ownership SHALL be coordinated by moving the active reference rather than by ending a live
cohort. An update SHALL NOT stop, drain, or terminate a cohort that is running from retained
immutable release content, and SHALL NOT require that nothing is running before it replaces
the mutable package. A cohort running from the mutable installation is the exception: its files
are what the installation replaces, so the update SHALL request its bounded shutdown, and the
session SHALL be told that an update ended it rather than being left to discover it.

#### Scenario: Verified foreground generations exist
- **WHEN** update starts while a verified cohort with live instances owns foreground generations
  from retained immutable release content
- **THEN** A1 SHALL install, materialize, certify, and commit the new active reference while that
  cohort keeps running
- **AND** the live instances SHALL continue on the release they started on

#### Scenario: A live cohort runs from the mutable installation
- **WHEN** update starts while a live cohort runs from the mutable package rather than from
  retained immutable content
- **THEN** A1 SHALL request bounded shutdown and verify ownership release before replacing the
  package
- **AND** the ended session SHALL report that an update ended it

#### Scenario: Installation or activation fails
- **WHEN** installation, materialization, certification, or activation fails
- **THEN** A1 SHALL retain diagnostics, avoid mixed ownership, and retain or restore one verified
  runnable cohort when possible
- **AND** rollback SHALL re-point the active reference without stopping a cohort that survived
  the update

### Requirement: Generation liveness is boot-scoped and observed
A process generation SHALL be live only when owned by a currently verified supervisor boot and backed by authenticated runtime ownership. Persisted state alone SHALL NOT prove liveness. Startup SHALL reconcile nonterminal generations from prior boots before publishing ownership.

#### Scenario: Supervisor was terminated
- **WHEN** a dead supervisor left generations marked active
- **THEN** the next coordinator or boot SHALL mark them non-live and SHALL NOT restart an old release merely because persisted rows exist

#### Scenario: Supervisor starts from existing control data
- **WHEN** a supervisor boots after an unclean exit
- **THEN** published ownership SHALL include only generations established or authenticated by that boot

### Requirement: Stale supervisor ownership is reconciled automatically
A1 SHALL validate ownership using handshake, process, release, endpoint, and boot identity. It MAY apply bounded platform-native cleanup only when stale ownership is proven safe to remove.

#### Scenario: Metadata names a dead process
- **WHEN** endpoint metadata remains after its process exits
- **THEN** A1 SHALL replace the stale record without asking the user to discover a PID

#### Scenario: Ownership safety is uncertain
- **WHEN** A1 cannot prove whether an unresponsive process owns a live generation
- **THEN** A1 SHALL preserve it and report a diagnosable blocked state rather than blindly terminating it

### Requirement: A superseded cohort retires when its work finishes
A cohort that is no longer the active one SHALL keep serving the instances it already has, and
SHALL accept no new ones. When its last instance exits it SHALL exit and remove its own endpoint
artifacts, leaving nothing for a later launch to reconcile.

Retained release content SHALL NOT be pruned while a live cohort runs from it. Reconciliation
SHALL validate each cohort's endpoint on its own identity, and SHALL NOT treat a second live
cohort as stale ownership.

#### Scenario: The last instance of a superseded cohort exits
- **WHEN** the final live instance of a cohort that is not the active one exits
- **THEN** that cohort SHALL exit and remove its endpoint artifacts

#### Scenario: Pruning considers what is running
- **WHEN** retained releases are pruned while a superseded cohort is still working
- **THEN** the release that cohort runs from SHALL be retained until it exits

#### Scenario: Reconciliation sees two live cohorts
- **WHEN** reconciliation runs while the active cohort and a superseded cohort are both live
- **THEN** each SHALL be validated on its own endpoint identity and neither SHALL be removed as
  stale

### Requirement: Supervisor tracks plural authenticated launch instances
The supervisor SHALL track zero or more concurrently active launch instances for its verified release cohort. Each instance SHALL be bound to its authenticated owner, profile, root process identity, containment identity, lifecycle state, and terminal outcome; persisted state alone SHALL NOT prove that an instance is live.

#### Scenario: Several owners register instances
- **WHEN** authenticated clients start multiple interactive commands concurrently
- **THEN** the supervisor SHALL register every instance independently and publish all verified live instance identities

#### Scenario: Unrelated client disconnects
- **WHEN** a control client that does not own a given instance disconnects
- **THEN** the supervisor SHALL leave that instance unchanged

### Requirement: Owner loss is reconciled per instance
The supervisor SHALL detect loss of an instance's authenticated owner and coordinate bounded cleanup or terminal reconciliation for that instance without waiting for another command. Reconciliation SHALL be idempotent and SHALL NOT clear another instance's ownership.

#### Scenario: Owner disappears before activation
- **WHEN** an owner disconnects after creating an instance but before its root runtime activates
- **THEN** the supervisor SHALL finalize that instance without leaving a launch blocker

#### Scenario: Owner disappears while the runtime is active
- **WHEN** an active instance owner disconnects
- **THEN** the supervisor SHALL apply the instance's non-detachable stop policy, record the outcome, and preserve unrelated instances

#### Scenario: Ownership is uncertain
- **WHEN** exact process or containment ownership cannot be verified during reconciliation
- **THEN** the supervisor SHALL preserve the uncertain process, retain diagnosable evidence, and SHALL NOT convert uncertainty into authority to terminate it

### Requirement: Cohort updates coordinate every active launch instance
An ownership-safe update SHALL enumerate all verified active launch instances in the affected cohort, request bounded shutdown for each, and verify that every instance released runtime ownership before replacing or retiring the cohort. A singular instance outcome SHALL NOT be treated as release of the whole cohort.

#### Scenario: Update encounters several active instances
- **WHEN** an update is authorized while multiple `a1` or `a1 pi` instances are active
- **THEN** A1 SHALL coordinate and verify each instance outcome before completing cohort replacement

#### Scenario: One instance cannot release ownership
- **WHEN** one affected instance cannot be stopped or verified within the update deadline
- **THEN** A1 SHALL fail or defer replacement safely without falsely marking the cohort idle

### Requirement: Immutable release retention is bounded by current ownership needs
A1 SHALL compute the retained immutable release set from the active release, the verified rollback release, any pending update transaction releases, every release used by a verified live cohort, and explicit external holds. Historical activation alone SHALL NOT retain a release after it leaves that protected set.

#### Scenario: Successful updates accumulate historical releases
- **WHEN** a successful update activates a new release and older releases have no live cohort, rollback, pending transaction, or external hold
- **THEN** A1 SHALL retain only the current protected set and make the remaining historical releases collectible

#### Scenario: Superseded release still has a live session
- **WHEN** an update activates a new release while a verified older cohort still owns one or more launch instances
- **THEN** A1 SHALL retain the older release until its final instance and cohort exit

#### Scenario: Rollback remains available
- **WHEN** a new release becomes active successfully
- **THEN** A1 SHALL retain one verified prior release as the rollback target even when no cohort currently runs from it

#### Scenario: Explicit external hold exists
- **WHEN** an agent, migration, or other declared authority holds a known release identity
- **THEN** reconciliation SHALL retain that release until the authority removes the hold

### Requirement: Release collection is reference-safe and restart-safe
Before physical deletion, A1 SHALL prove that a release is outside every protected set, canonically contained directly beneath the managed release store, and not represented by a verified live endpoint. A1 SHALL detach obsolete selectors and records atomically before deleting content, and interruption SHALL leave only recoverable unselected content or managed trash.

#### Scenario: Collection is interrupted after state detachment
- **WHEN** the collector stops after removing an obsolete release from durable state but before deleting all of its files
- **THEN** the next cleanup reconciliation SHALL recognize and finish deleting the unselected managed content without making it selectable

#### Scenario: Recorded path escapes the release store
- **WHEN** an obsolete record or filesystem entry resolves outside the canonical managed release store or through an unapproved link
- **THEN** A1 SHALL refuse deletion, preserve the external path, and record a bounded diagnostic

#### Scenario: Release becomes protected during reconciliation
- **WHEN** concurrent ownership or transaction reconciliation shows that a candidate release is protected before detachment commits
- **THEN** collection SHALL leave its state and content intact

#### Scenario: Obsolete content is deleted
- **WHEN** a release is proven unreferenced and contained
- **THEN** A1 SHALL NOT perform a complete payload hash pass solely as a prerequisite to deleting that release

### Requirement: Supervisor startup is bounded and diagnosable
When bootstrap starts a detached supervisor for a verified immutable release, supervisor readiness or failure SHALL be correlated to that exact startup attempt and observed within a bounded interval. A failure before endpoint publication SHALL preserve a bounded, sanitized diagnostic and process outcome rather than being reported only as a generic readiness timeout. Startup evidence SHALL NOT expose credentials, prompts, session content, or unrelated environment values.

#### Scenario: Supervisor publishes its endpoint
- **WHEN** a detached supervisor validates its release, opens its cohort endpoint, and publishes matching endpoint metadata
- **THEN** bootstrap SHALL recognize readiness for that exact release and continue without retaining a false failure record

#### Scenario: Supervisor exits before readiness
- **WHEN** the detached supervisor fails release validation, storage initialization, endpoint binding, or another pre-listen operation
- **THEN** bootstrap SHALL fail within the startup bound with the correlated exit outcome and sanitized startup diagnostic

#### Scenario: Stale startup evidence exists
- **WHEN** a prior supervisor attempt left success or failure evidence under the same runtime root
- **THEN** a new attempt SHALL NOT accept that evidence unless its unguessable attempt identity and selected release identity match

### Requirement: Darwin launch instances use certified native containment
On supported macOS systems, every A1-owned interactive launch instance SHALL use a verified Darwin-native guardian that creates an independently addressable process group, publishes the root process start identity and containment identity, transfers foreground-terminal ownership when applicable, and terminates the owned group after root exit, owner loss, or bounded shutdown. The Darwin guardian artifact SHALL be marked supported only when its platform, architecture, bytes, native protocol, process identity, and containment behavior are certified.

#### Scenario: Darwin interactive root starts
- **WHEN** a verified macOS cohort launches `a1` or `a1 pi`
- **THEN** the native guardian SHALL spawn the selected root in its own process group, publish stable process and containment identities, and transfer foreground ownership without shell interpretation

#### Scenario: Darwin owner disappears
- **WHEN** the authenticated launch owner exits or disconnects while its Darwin process group remains live
- **THEN** A1 SHALL perform bounded group cleanup and SHALL preserve unrelated launch instances

#### Scenario: Darwin root exits normally
- **WHEN** the contained root process exits
- **THEN** the guardian SHALL clean remaining members of that owned process group, restore prior terminal foreground ownership when applicable, and report the root outcome

#### Scenario: Darwin artifact is unsupported or inconsistent
- **WHEN** the packed guardian manifest is unsupported, names the wrong platform or architecture, or does not match the guardian bytes
- **THEN** launch SHALL fail before creating a launch instance and SHALL NOT downgrade to uncontained execution

### Requirement: Certification publication releases ownership safely under filesystem contention
Dependency certification publication SHALL retry transient sharing or access contention encountered while releasing its publication lease within a finite deadline. Release SHALL act only on the publisher's own lease generation and its private retired artifacts. It SHALL NOT remove, rename, or reclaim another live publisher's lease. Retrying release SHALL NOT rewrite a valid canonical certification, mutate protected legacy evidence, or repeat payload-wide verification. Non-retryable errors and exhausted deadlines SHALL remain observable failures rather than false success.

#### Scenario: Lease release encounters a transient sharing failure
- **WHEN** publication has validated or published canonical evidence and lease release encounters a transient filesystem sharing failure that clears within the deadline
- **THEN** the operation SHALL complete without requiring a caller retry
- **AND** the canonical evidence and protected legacy evidence SHALL remain unchanged by the release retries

#### Scenario: Lease release cannot finish safely
- **WHEN** contention persists beyond the deadline or release encounters a non-retryable error
- **THEN** publication SHALL terminate with a diagnosable failure within the bounded release budget
- **AND** complete certification evidence SHALL remain intact for subsequent validated recovery

#### Scenario: A successor owns the publication path
- **WHEN** a delayed release attempt observes a different lease generation at the active publication path
- **THEN** it SHALL preserve the successor's lease and SHALL NOT treat ownership uncertainty as permission to delete or rename it

#### Scenario: Independent publishers recover an abandoned lease
- **WHEN** independent processes concurrently recover the same proven-abandoned lease and contend to publish one certification
- **THEN** they SHALL converge on one valid read-only canonical record once transient contention clears within their deadlines
- **AND** a delayed reclaimer SHALL NOT steal a replacement lease, and valid protected restart evidence SHALL remain usable

### Requirement: Dependency certifications use a dedicated managed directory
A1 SHALL write new dependency-layer certification records to `<dataDir>/dependency-certifications/<layerId>.json`, where `<layerId>` retains the existing `dependencies-<32-hex>` identity. Record placement SHALL NOT change the layer's full content digest, certification schema, platform policy, immutable payload path, or release identity. New writers SHALL NOT create root-level dependency certification records.

#### Scenario: A dependency layer is certified for the first time
- **WHEN** A1 certifies a dependency layer and the dedicated directory does not yet exist
- **THEN** A1 SHALL create the managed directory and publish the record at `dependency-certifications/<layerId>.json`
- **AND** no root-level `dependency-layer-certification-<layerId>.json` SHALL be created by that writer

#### Scenario: A previously certified layer is reused
- **WHEN** a valid record already exists in the dedicated directory for the expected layer identity and current platform
- **THEN** A1 SHALL reuse it without a payload-wide verification pass solely to resolve its storage location

### Requirement: Legacy dependency certification migration preserves validation authority
A1 SHALL continue to recognize a legacy `<dataDir>/dependency-layer-certification-<layerId>.json` record when the canonical record is absent. Legacy records SHALL pass the same identity, manifest, and platform validation required for canonical records before reuse or migration. Successful migration SHALL publish a complete canonical record before any eligible legacy copy is removed and SHALL NOT require payload-wide reads solely for relocation. Migration SHALL be retryable after interruption or concurrent attempts. A present but invalid canonical record SHALL NOT be bypassed by falling back to a legacy record.

#### Scenario: A valid legacy-only installation is used
- **WHEN** A1 reuses a layer with a valid legacy record and no canonical record
- **THEN** A1 SHALL publish the validated certification in the dedicated directory without changing the layer identity or reading all payload bytes
- **AND** the legacy copy SHALL remain until no protected consumer needs it

#### Scenario: Legacy evidence does not match the layer
- **WHEN** the legacy record has an incorrect schema, layer identity, content digest, or platform evidence
- **THEN** relocation SHALL NOT turn that record into trusted certification
- **AND** A1 SHALL fail safely or use its existing complete-verification recovery before executing uncertified content

#### Scenario: Canonical and legacy records disagree
- **WHEN** a canonical record exists but fails validation and a legacy record is also present
- **THEN** A1 SHALL reject the canonical evidence or recover through complete verification rather than silently selecting the legacy record

#### Scenario: Migration is interrupted or performed concurrently
- **WHEN** migration stops before publication or another process publishes the same canonical record
- **THEN** a later attempt SHALL recover using validated complete evidence without accepting a partial file or deleting the only valid legacy record

### Requirement: Certification relocation preserves retained cohort restart evidence
A1 SHALL keep legacy certification files unchanged while a protected retained release, live cohort, or active transaction still requires their legacy paths, including paths embedded in durable restart seals. New restart seals SHALL bind canonical certification paths after successful canonical publication. Moving records SHALL NOT invalidate otherwise valid protected legacy restart evidence or bypass identity, path, binding, and platform checks.

#### Scenario: An older retained release references the legacy file
- **WHEN** a dependency record is migrated while a retained rollback release or live cohort still requires its legacy path
- **THEN** A1 SHALL preserve the legacy file and its recorded evidence
- **AND** that release SHALL remain restartable under its existing certification rules

#### Scenario: A new release receives a restart seal
- **WHEN** A1 seals a release whose dependency certification has been published in the dedicated directory
- **THEN** the seal SHALL reference `dependency-certifications/<layerId>.json`
- **AND** a later restart with unchanged evidence SHALL not need payload-wide verification solely because of the directory change

### Requirement: Dependency certification cleanup handles both layouts safely
A1 SHALL include the dedicated directory and legacy root-level records in bounded, retryable managed cleanup. It SHALL preserve records required by retained releases, live cohorts, or active transactions, and SHALL eventually remove obsolete legacy copies once valid canonical evidence exists and no protected consumer requires the legacy path. Once a dependency layer is safely removed, cleanup SHALL remove its obsolete records from both layouts. Unknown files and paths outside managed storage SHALL remain untouched.

#### Scenario: A migrated legacy copy is no longer needed
- **WHEN** valid canonical certification exists and no protected release, cohort, or transaction requires the legacy record
- **THEN** bounded cleanup SHALL remove the obsolete root-level copy without removing the canonical record

#### Scenario: An unreferenced dependency layer is collected
- **WHEN** A1 safely removes an unreferenced dependency layer with records in both layouts
- **THEN** cleanup SHALL remove both obsolete records, retrying transient failures without blocking interactive startup

#### Scenario: Cleanup encounters an absent directory or unrelated entry
- **WHEN** the dedicated directory is absent or contains unknown files, subdirectories, or symbolic links
- **THEN** cleanup SHALL tolerate absence and SHALL NOT treat unrelated entries or link targets as owned certification records

#### Scenario: A managed certification path escapes the data root
- **WHEN** a certification directory or record resolves through a link outside managed storage
- **THEN** A1 SHALL refuse to trust, migrate, overwrite, or delete that external target as managed certification evidence

### Requirement: Releases may reuse certified immutable dependency content
A materialized release MAY bind release-specific product content to one or more separately certified immutable dependency layers. Layer identity SHALL derive from its complete selected runtime content, every release SHALL bind the exact layer identities it executes, and no mutable installation path SHALL remain a runtime dependency after activation.

#### Scenario: Consecutive releases use identical dependency content
- **WHEN** a newly installed release selects dependency-layer content identical to an existing certified layer
- **THEN** A1 SHALL reuse the existing immutable layer and stable dependency path rather than copy it into another release-specific dependency tree

#### Scenario: Dependency content changes
- **WHEN** any selected dependency module, package metadata, native binary, or declared runtime asset differs
- **THEN** A1 SHALL derive and certify a different layer identity before the new release can execute it

#### Scenario: A release binds a shared layer
- **WHEN** A1 validates, activates, rolls back, or launches a layered release
- **THEN** it SHALL verify that the release manifest, layer manifest, content identities, and managed paths agree before selecting its entry point

#### Scenario: A layer remains referenced
- **WHEN** any retained release or verified live cohort binds a dependency layer
- **THEN** garbage collection SHALL preserve that layer

#### Scenario: No release references a layer
- **WHEN** bounded retention removes the final release reference and no live cohort executes the layer
- **THEN** A1 SHALL make the layer eligible for ownership-safe collection

### Requirement: Certified immutable content remains safely restartable
A1 SHALL preserve bounded durable certification evidence for an approved immutable release and its dependency layers so loss of the certifying supervisor does not by itself require payload-wide content reads before the next launch. Restart validation SHALL bind the selected release record, complete content identities, canonical managed paths, dependency bindings, and platform immutability evidence. A1 SHALL execute no selected release content when that evidence is stale, ambiguous, unsupported, or inconsistent until complete verification succeeds.

#### Scenario: Approved release loses its supervisor
- **WHEN** the active approved release has valid durable certification but no live verified supervisor
- **THEN** A1 SHALL validate that certification with work bounded independently of the number and total bytes of payload files before starting a replacement supervisor

#### Scenario: Restart certification is inconsistent
- **WHEN** the release record, manifest, dependency binding, managed path, content identity, or platform immutability evidence differs from durable certification
- **THEN** A1 SHALL reject the restart fast path and SHALL NOT execute selected release content unless complete verification succeeds

#### Scenario: Platform cannot prove durable immutability
- **WHEN** the current platform cannot establish that certified release and layer content remained immutable while no supervisor was live
- **THEN** A1 SHALL use a safe bounded alternative or complete verification rather than treating prior process authority as current authority

### Requirement: Existing full-copy releases remain valid compatibility cohorts
Introducing layered releases SHALL NOT invalidate an existing certified full-copy release satisfying the current private launch contract that remains selected for rollback or used by a live cohort. New launches SHALL follow the active release layout, while each existing process SHALL continue using the layout from which it started.

#### Scenario: Update occurs while an old full-copy cohort is live
- **WHEN** a layered release becomes active while a verified current-contract full-copy release still serves live instances
- **THEN** the older cohort SHALL continue without path rewriting and its full release root SHALL remain retained until retirement

#### Scenario: Layered activation fails
- **WHEN** dependency-layer materialization, certification, binding, or startup fails
- **THEN** rollback SHALL select a verified compatible release as a whole and SHALL NOT combine product files from one release with dependencies from another

### Requirement: Expected release coordination and SQLite notices stay off the interactive terminal
A successful interactive launch SHALL NOT print release activation, superseded-cohort handoff,
or SQLite experimental-stability notices. A1 SHALL NOT suppress unrelated Node warnings or
non-recoverable launch failures to satisfy this requirement.

#### Scenario: SQLite runtime reports experimental stability
- **WHEN** an A1-owned SQLite boundary runs on a supported Node build that emits the `SQLite is an experimental feature` warning
- **THEN** that warning SHALL NOT reach the interactive terminal
- **AND** unrelated Node warning classes SHALL retain their normal observability

#### Scenario: Superseded admission is recovered internally
- **WHEN** a selected supervisor reports that another release became active and bounded reselection succeeds
- **THEN** A1 SHALL launch the selected active release without printing the internal superseded-release diagnostic

#### Scenario: Reselection cannot converge
- **WHEN** bounded reselection cannot establish one eligible active launch target
- **THEN** A1 SHALL exit with a concise actionable failure
- **AND** SHALL NOT require the user to close retained sessions, restart the machine, delete state, or discover process identifiers

### Requirement: Native process identity inspection reports only active process objects
A1's native process inspector SHALL emit a process identity only when the exact opened operating-system process object is observed active. The identity SHALL include the process ID and stable creation token needed to distinguish PID generations. A terminated-but-queryable process object and a nonexistent PID SHALL produce the established absent/dead outcome without identity output. Permission denial, unsupported access, wait failure, and identity-query failure SHALL remain diagnosable inspection errors and SHALL NOT be converted into proof that a process is either live or dead.

#### Scenario: Inspect an active process repeatedly
- **WHEN** the Windows guardian inspects the same active process more than once
- **THEN** every successful result SHALL report the same PID and creation token
- **AND** each result SHALL be derived from a process object observed active during that inspection

#### Scenario: A terminated process object remains queryable
- **WHEN** a Windows process has terminated but another handle keeps its process object available for creation-time queries
- **THEN** guardian inspection SHALL report the established absent/dead outcome with no identity
- **AND** queryable creation metadata alone SHALL NOT make the process live

#### Scenario: Inspection lacks authority or fails
- **WHEN** A1 cannot acquire the required state-and-identity access or a Windows wait or identity API fails
- **THEN** inspection SHALL fail with a concise diagnosable error
- **AND** reconciliation SHALL preserve ownership uncertainty rather than silently treating the process as active, dead, or safe to terminate

#### Scenario: A PID is reused
- **WHEN** a later process receives the numeric PID of an earlier process
- **THEN** its creation token SHALL differ from the earlier process identity
- **AND** state observation and token retrieval within one inspection SHALL refer to the same opened process object
