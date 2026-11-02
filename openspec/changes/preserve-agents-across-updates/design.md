## Context

The maintainer rejected the original idle-boundary process-migration proposal. The required experience is ordinary terminal reconnection: two working Agents and one idle Agent remain the same two working Agents and one idle Agent after background update and relaunch, with all three immediately usable. No Agent may restart, freeze, wait for idle or become inaccessible merely because A1 updated.

Solo already has a different explicit lifecycle: closing that runtime provides its resume-session path. Preserve that behavior. In multitab mode, closing the outer client is a detach, not Agent exit; an update must not turn reconnect into per-session resume, session-picker recovery or a fresh workspace. The post-update access contract is the same as ordinary multitab reopen.

`roles/scope.rs` intentionally binds host authority and child launch custody to immutable release. `ensure-terminal-host.ts` and maintenance select only the invoking release's namespace. This preserves code custody but currently also partitions workspace visibility: the new client opens an unrelated workspace while older Agents may keep running. Release isolation should partition execution authority, not the user's ability to reconnect.

Changing a loaded engine implementation and preserving all of its arbitrary in-memory work are not equivalent to reconnecting. This design changes the client and control-plane route while preserving live execution. It does not relabel an old process as new code or restart it later when idle.

## Goals / Non-Goals

**Goals:**
- Updated A1 reconnects to the same live profile workspace, independent of which release created each Agent.
- Running and idle Agent, holder and tool process identities stay unchanged by update/reconnect.
- Input, output, queued work, drafts, dialogs and session identities remain with their live owner and usable after reconnect.
- A client update is eligible only while every affected live runtime has a verified compatible control path.
- Client/coordinator replacement, concurrent relaunch and interrupted activation preserve workspace authority and retention without recreating execution.

**Non-Goals:**
- Automatic Agent replacement, including idle restart, quiesce/checkpoint transfer or automatic suspension.
- Hot-swapping arbitrary engine/extension code or transferring model/tool call stacks between processes.
- Collapsing release-local registry/credential/holder/bridge authority into one mutable host.
- Arbitrary executables/adapters, cross-user/profile attachment, obsolete launch-contract execution, reboot restoration or solo/external writer adoption.

## Decisions

### 1. Make the terminal client disposable and execution durable

Treat A1 as separate client/control and execution planes. The terminal client renders and controls a durable profile workspace; it is replaceable on every launch. A minimal persistent execution host owns autonomous Agent work, its subprocess tree, session writer lease and live state. Where existing runtimes retain their own editor/PTY/screen, their compatibility adapter preserves that custody during rollout. Closing or upgrading a client changes no execution-plane lifecycle.

Keep the permanent side limited to the responsibilities required for autonomous execution and state custody. Terminal-client UI, update orchestration, release selection and replaceable workspace policy must not require that host to reload. A host cannot literally contain no state: whatever allows work to continue while every terminal is closed must remain there or in another equally durable execution component.

Define one small versioned runtime-control API with a backward-compatible mandatory core for discovery, identity, attach/reconnect, state/event observation, input admission, interactions and explicit lifecycle requests. Add optional behavior through declared capabilities and additive fields, not silent semantic changes. Bind commands to session/incarnation/controller identity and a stable request identity; distinguish rejected, accepted and uncertain delivery so reconnect never blindly replays side effects. Sequence observations and require an explicit resync boundary when retained history is unavailable. Authenticate all endpoints and fence stale owners. A stable API is a tested compatibility commitment, not a claim that an unversioned protocol can never evolve.

Use typed API fixtures, consumer/provider conformance tests and actual predecessor-to-candidate reconnect gates. An incompatible required API change is not a default automatic update; it needs a separate deliberately authorized transition that preserves access. Do not retrofit running source code or alter its immutable payload to manufacture compatibility.

An Agent created under A keeps its immutable A custody while clients B and later C can control it through verified compatible routes. New Agents use the selected client release's execution artifacts. Existing Agents do not automatically restart even if idle for hours. Their normal explicit close/restart and independent crash recovery retain their existing semantics; update itself is not a crash or restart reason.

This separation provides the requested new application version with uninterrupted existing work. Features requiring new execution code apply to newly created or explicitly restarted Agents, not by pretending an old live engine has changed implementation.

### 2. Store one durable profile workspace independently of release

Add an owner-only workspace index keyed by canonical profile, not client payload. Use an OS-exclusive writer lease and durable epoch for workspace mutations. Store stable logical tab identity, qualified source namespace/tab/incarnation, display name and name source, order, selection and bounded control-route metadata. Credentials, environment values, prompts, transcripts, drafts and terminal cells stay out of this index.

Each source registry remains authoritative for its own processes. Import existing supported source tabs idempotently after exact profile/release verification; do not directly mutate foreign registries, resurrect closed/stopped tabs or expose hidden prewarm. Colliding local IDs in different sources remain distinct logical Agents. Last-good recovery or a preserved failure is required if the index is damaged; no replacement empty workspace is written as a recovery shortcut.

The workspace index is a locator/topology authority, not a serialized substitute for live execution. Drafts, queued prompts, attachments, active dialogs and tool state remain in their original owners; existing private checkpoints remain recovery evidence rather than a normal update-transfer mechanism.

### 3. Use explicit source routes, not generic wrong-release fallback

The new native client aggregates source-qualified live tab state. Bounded discovery recomputes namespace identity from the exact canonical profile and verified immutable source root, verifies owner/native-start/boot/login identity and authenticates with that namespace's owner-only authority. Exact selected-source identity precedes optional capability negotiation.

An explicit source-route adapter binds expected namespace/release/endpoint, compatible protocol and permitted client operations. It can view/control existing Agents using the source's controller-generation barriers without admitting foreign holders/bridges or changing source execution custody. Generic attach still refuses an unselected different release; a matching generation or display version never grants authority. Keep all terminal bytes and composition in the native path.

Route input, paste, resize, mouse, rename, close and outstanding permission/extension responses to the actual live owner. Existing multi-client/controller attribution remains intact. New-tab and singleton utility creation use the selected release, not the old source behind the currently selected Agent. Preserve current retained state and work produced while detached, not a stale screenshot or replayed transcript.

Source servers can remain as authenticated execution/control backends. Replacing a workspace coordinator changes only route ownership under a fenced epoch. It never takes an execution restart lease or sends a source stop. If a server independently fails, use its existing originating-release recovery path, retaining holders/children unchanged where supported.

### 4. Bind activation to continuity compatibility

After target materialization/verification but before committing it as the ordinary active client or issuing restart readiness, inspect all affected live profile workspaces through bounded owner-verified discovery. The candidate must prove a usable compatible route for every live source runtime, including its current controller/interaction semantics. Version ordering or matching generation alone is insufficient.

Coordinate this verdict with workspace/activation authority so concurrent Agent creation, profile changes or client relaunch cannot invalidate it silently between check and commit. Stable runtime-control contracts and explicit required/optional capabilities make this tractable across future releases. Additive optional features can degrade without disabling core control; a candidate missing core view/input/interaction support is incompatible.

If compatibility is unavailable or cannot be established, keep a verified eligible prior client active and callable from the installed launcher. Candidate files may be staged, but the update is not declared completed/restart-ready. Preserve live runtimes and all data. Do not silently open an empty B workspace, display inaccessible placeholder tabs as success, execute an obsolete private contract or force old Agents to close. A later compatible candidate or explicit separate maintainer-directed action is needed for an incompatible runtime-contract transition.

Revalidate routing at reconnect. Unexpected failure must retain the last verified usable access route/client with bounded recovery, not discard topology or start replacement writers. An operational source crash can still surface normal recovery; it must not be confused with successful seamless update compatibility.

### 5. Transfer only control ownership, with retry-safe recovery

Workspace mutations and client/control handoff carry the exact profile, source release, source tab/incarnation, controller revision and workspace epoch. Stale control owners cannot relabel or replay admitted input. Concurrent updated launches converge on the same logical topology and existing controller policy without duplicating Agents.

Interrupted activation or coordinator replacement reconciles the committed client selection, workspace epoch, actual source identities and existing routes. Reconnect live sources before creating any new default Agent. Never infer that B's empty release-local registry means the profile is empty. No update recovery phase launches another writer for a session already held by a live source.

Preserve the existing causal barrier for controller transfer. A brief ordinary reconnect transport handshake is not an Agent quiesce: Agents continue executing/outputting while it occurs, and control becomes usable when the normal attach completes without an upgrade-specific idle wait. Admitted input stays ordered; uncertain input is never automatically resent.

### 6. Retain code and private recovery for the complete live lifetime

Continue collecting holds across all release namespaces, plus durable workspace/control-recovery references and the verified fallback client. Keep source Node/entry/addon/dependencies while any live holder, child, tool-custody or unsettled recovery obligation requires them. Client activation cannot make old artifacts collectable merely because its own registry is empty.

Hold release/checkpoint references throughout independent server recovery and control-plane handoff, including moments with no coordinator. Unknown/unreadable/linked state and unavailable native identity inspection remain conservative retention outcomes. Retire obsolete client-only references only after compatible control custody is committed; live execution artifacts remain until their actual execution/recovery lifetime ends.

### 7. Present reconnect, not Agent migration

The successful path shows the updated A1 client with the same tabs, order, selection, live contents, unsent input, dialogs and working/idle states. There is no Agent-upgrade spinner, waiting-for-idle badge, disabled tab or automatic later restart. Work legitimately continues while detached, so the restored screen reflects current progress rather than freezing the pre-close frame.

Client update readiness belongs to verified compatible client activation, not a promise to replace every live engine. Keep origin/version reporting truthful without making a mixed execution backend a warning or blocker. Move client restart responsibility to the appropriate client-owned boundary and avoid a completed client reconnect continually requesting the same restart. Preserve existing copy acknowledgement priority, terminal geometry, Notify/No behavior and explicit update diagnostics.

### 8. Prove the first fixed update using actual predecessors

Candidate-only fixtures do not establish access to already-running older Agents. Use actual supported published release-scoped predecessors, including busy, idle, queued and needs-input states. Their existing attach/control protocol must work without modifying immutable old code or requiring a new migration acknowledgement.

Where a predecessor lacks a needed capability, provide a verified compatible client adapter for normal control or declare candidate activation incompatible before restart readiness. A visible error tile or manual session reopening is not delivery of this outcome. Pre-cutover private contracts remain ineligible; any deliberate cutover is separate authorization, not an automatic data/process migration shortcut.

## Approved tab-bar refinement

The maintainer approved restoring the established tab-bar contract and automated coverage after observing Settings inserted before already-added Agents and open/close flashes. Keep the existing slim utility composition and its fast-loading mechanism; this work changes tab topology and presentation, not utility startup architecture.

Use one visible order independent of source discovery and hidden prewarm order. Newly shown utilities and new Agents append after every currently shown tab; an initializing Agent reserves the same position as its committed identity. A visible singleton is selected in place, while a hidden one appends on reveal. Metadata acknowledgements, source snapshots and lifecycle/color transitions cannot overwrite newer user order.

Commit only the requested source/tab/view surface. Superseded source frames and intermediate topology snapshots cannot repaint an old active tab, steal focus or expose a blank child/cursor. Retain the Agent-only initializing shade/fill and common final active background without delaying ready body/input.

Settings and Changelog share singleton toggles. Toggling an active utility hides it for reuse, including when it is the only visible tab; that case shows the landing. Explicit Close stops/removes the instance. Closing or hiding the active tab selects its immediate left neighbour, then a surviving right neighbour; hidden utilities never become fallback tabs. Input bound to a cancelled view never leaks into the fallback.

Regression coverage must drive complete event sequences and actual workspace source routing, not merely prove `Vec::push`: delayed/reordered source and persistence results, hidden prewarm/reveal, Agent creation handoff, utility toggle/close, active/background close, drag/overflow/navigation, reconnect, and stable rendered tab/body identity. Existing native controller and text-terminal guarantees remain unchanged.

## Approved empty launch and native-fixture isolation refinement

The maintainer explicitly approved both refinements in PR 858. Plain `a1` is an attach operation, not a create operation: after authenticated complete source discovery, select an existing live Agent workspace or show the landing when no Agent exists. Hidden/prewarmed utilities alone do not establish an Agent workspace. Unknown or incompatible source state is not proof of emptiness. Existing live topology and a complete selected source surface must remain the first nonempty presentation; no initial landing is painted while resolving known retained Agents. Explicit `tab.create` and explicit session-open requests retain their intent, release-local execution and writer boundaries.

The Defender `Trojan:Win32/Bearfoos.A!ml` detection is unresolved. Earlier local test passes establish neither safety nor a false positive. Keep flagged artifacts quarantined and do not rebuild, copy under new names, restore or execute them to evade detection. Native fixture validation stays isolated in CI; ordinary local application testing remains the maintainer's choice. Use static/type checks and explicitly non-native regression files locally.

Native process fixtures retain their true multi-release and process-identity assertions, but building/running fixture-enabled code requires the isolated CI policy rather than a local-build override or a generic `CI=1`. Windows execution must keep Defender enabled and fail on detections; the disposable CI runner must have no production credentials and restricted egress. An unavailable execution boundary blocks native evidence rather than silently skipping tests or claiming certification. Workflow approval/provisioning and a security verdict must not be fabricated from successful tests. Existing required native targets remain required.

The concrete boundary starts automatically in normal eligible CI using a privileged controller outside the writable workload checkout. It does not request deployment approval, query human review history or create an approval environment. The maintainer explicitly rejected the agent-added manual gate; remove that gate and its API dependency while preserving OS isolation, exact-run custody, security failures and every required native check. The controller creates a fresh restricted OS account, stages offline public dependencies without package scripts, strips credentials/special files and proves its actual UID/SID, local connectivity, external denial, credential-canary denial and source immutability before issuing the exact-run receipt. Windows uses limited tasks, per-SID firewall rules and protected ACLs; Linux uses Bubblewrap user/PID/network namespaces for a locked headless service account; macOS uses a non-login UID and inherited Seatbelt restrictions while allowing local Unix IPC. Development core/guardian and runtime cells, Full regression and publication use this path. Closure and Defender failures remain required failures, and fixture-mutated native targets do not become shared caches. PowerShell helpers remain owned naming inputs through the existing shell inspector, including hyphenated declarations.

The macOS custody repair replaces process-local `audit_session_self()` port names with kernel audit user/session IDs. Immutable predecessor Mach-port metadata remains incomparable, not a proof of login equality or termination. Only the explicit source adapter can admit it after an unchanged boot, exact live process identity, authenticated epoch/credentials and connected `LOCAL_PEERTOKEN` matching PID, real/effective UID and current audit user/session. No native check is removed and no generic cross-release admission is relaxed.

## Alternatives Rejected

- Idle-boundary process migration: explicitly rejected by the maintainer; alters existing Agents and introduces new interruption/recovery risk without being necessary for client continuity.
- Remove the release digest: lets new creation/recovery execute incorrect artifacts and weakens existing authority.
- Reopen session files: cannot preserve in-memory turns, tools, drafts/dialogs or writer exclusivity.
- Restart all Agents on update: violates the central resident-workspace promise.
- Retain only the old UI forever: does not provide an updated client for compatible releases. The old client is a safety fallback only when a candidate is not eligible to activate.
- Claim seamless restoration while showing blocked tabs: preserves metadata but not the requested live access.

## Risks / Trade-offs

- Old execution code remains live until explicit closure/restart. This is necessary to preserve arbitrary live memory and must be distinguished from client version; no hidden future idle restart is added.
- Compatibility adapters increase routing complexity. Keep exact-source checks narrow and test wrong profile/release/credentials plus unchanged generic refusal.
- Active-source enumeration races activation. Fence workspace and activation decisions, revalidate required control capabilities and test concurrent creation/relaunch.
- Child-owned historical update overlays may not expose a remote acknowledgement. Exercise real predecessor behavior and resolve client-ready presentation without scraping arbitrary terminal content or claiming unproven compatibility.
- Long-lived Agents retain old immutable artifacts. This is intentional; storage reclamation must not trade away live work or its recovery path.

## Validation Plan

- API consumer/provider conformance, exact protocol fixtures and deterministic workspace/routing/compatibility tests: additive optional fields, mandatory-core semantics, ordered/request-identified input, observation resync, colliding IDs, profile aliases, source capability differences, current-controller interactions, stale epochs/incarnations and concurrent relaunch/activation.
- Process-level tests: start two unfinished Agents and one idle Agent, capture holder/child/tool native identities, update, close the terminal, reopen repeatedly, and assert the same identities with live control on every tab. Then finish the working Agents and keep all three idle long enough to assert no delayed update-triggered restart.
- Preserve unsent drafts/attachments, queued-input identity, pending dialogs, selected tab, names/order and session identity. Assert work/output advances while detached and no prompt or tool call is automatically replayed.
- Exact-package predecessor-to-candidate cases on Windows x64, Linux x64 and macOS arm64; actual published sources are required, including first-fixed-release discovery without a pre-existing workspace index.
- Inject client/coordinator death before/after activation and route commit; verify safe reconnect, no duplicate writer, no empty-workspace commit, retained prior client and conservative GC holds.
- Negative compatibility cases must block activation/readiness while leaving the old access path callable and all Agent identities unchanged. They are failure containment evidence, not successful seamless-upgrade evidence.
- Reconcile resident architecture and presentation contracts during implementation. Before push, run only typecheck, affected test files and strict OpenSpec validation; CI owns selected native/exact-artifact lanes. Do not terminate production Agents.

## Approval and Delivery Status

The maintainer approved this revised scope and explicitly requested implementation. The same branch/PR now contains ordinary multi-source attach, stable control conformance, durable topology, activation gating, connected-client readiness and recovery/retention integration with their regression cases. Actual published-predecessor continuity passed on Windows with busy/idle Agents, queued work, retained draft, client death and originating-coordinator recovery. See `implementation-evidence.md` for bounded results and unrun exact-package/platform evidence; no production process was stopped or migrated. Legacy child notice acknowledgement uses an explicit outer client explanation when the immutable child lacks the optional metadata feature. This does not change execution code or disable live control. Architecture, task and known-limitation bookkeeping is reconciled, and the branch includes current `origin/develop`. Plain Acceptance and the final outcome marker hand readiness/finalization to trusted automation; required exact-head CI remains authoritative.
