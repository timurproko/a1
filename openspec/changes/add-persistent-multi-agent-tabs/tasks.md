## Authorization and sequencing

This is a planning-only refinement of draft PR #586. No implementation, tests, workflow changes, canonical-spec synchronization, finalization, or merge are authorized. Begin unchecked implementation tasks only after explicit plan approval and an implementation request, in this same worktree/branch/PR. Milestones are ordered proof gates within one delivery, not independently shippable increments; keep `tabs.resident=false` through preview delivery. Planning checkmarks do not establish product evidence.

## 1. Contracts and baseline

Exit evidence: agreed ownership and durability contracts, concrete platform/protocol proof obligations with focused evidence before dependent behavior is enabled, and reconciled architecture/certification boundaries. Historical prototype results and pending proof records are not accepted evidence.

- [x] 1.1 Reconcile the Windows x64 opt-in proposal, design, deltas, and staged delivery around the v2/herdr/current-A1 source audit; distinguish session hosting from separately planned work isolation and coordination
- [x] 1.2 Retain the held workspace change as split-layout/multiplexer-only scope; strictly validate both planning changes without restoring historical runtime code or changing historical verdicts
- [ ] 1.3 After implementation approval, reconcile then-current `origin/develop` in this branch, preserving #588's terminal-query answers/Windows CI ownership and #667's surviving-owner terminal restoration
- [ ] 1.4 Specify and prove fixed-role authenticated native resident creation/recovery, artifact/profile/request verification, valid Windows spawn flags, explicit environment/cwd, bounded WMI fallback, and observed job detachment without job-wide or silent breakaway on ordinary launch/tab-child jobs
- [ ] 1.5 Specify and prove profile-neutral Windows session-writer lock custody for resident/direct/fallback/Pi-comparison runtimes, canonical file aliases and new-file reservation, holder-death/writer-survival ordering, verified tree exit, atomic session switching, and safe rejection without resident initialization
- [ ] 1.6 Freeze bounded generation-stable protocol fixtures, role capabilities, epochs/topology/surface revisions, one-controller admission, and a causal transfer barrier that accounts for PTY/child-buffered input; prove delayed old-controller commands cannot acquire a new identity and ambiguous requests fail closed
- [ ] 1.7 Define journal submission/session identity, admission/commit/retirement ordering, first-turn recovery, periodic draft checkpoints, degraded guarantees, and Windows file/atomic-replacement/directory-metadata durability primitives with supported-filesystem limits
- [ ] 1.8 Reconcile architecture/proof documentation during approved implementation: preserve native-only terminal authority, retire obsolete structured-workspace assumptions, map single-pane resident certification versus future split certification, and leave historical pending acceptance bytes/verdicts unchanged

## 2. One persistent tab

Exit evidence: one complete A1 text UI survives terminal/client closure and reattaches with retained output and usable input; normal and forced attach exit restore the outer terminal. No full tab-UX or performance claim substitutes for this survival proof.

- [ ] 2.1 Restructure `native/terminal-host` into shared I/O-free state machines and Windows `server`, per-tab `holder`, and foreground `attach` roles, retaining existing query/input/mouse/selection/resize/cleanup probes while removing fixed 2×2 presentation from the shipping path
- [ ] 2.2 Implement one holder with one ConPTY, contained verified child tree, continuously parsed libghostty-vt model, 10 MiB scrollback cap, terminal-query replies, retained snapshots/patches, and bounded reader/writer/pre-ready queues
- [ ] 2.3 Implement authenticated per-user/profile discovery, owner-only client/profile secrets, derived per-incarnation holder/bridge credentials, native process identity, exclusive registry-writer lease, durable epoch, minimal atomic registry, and readiness before input admission
- [ ] 2.4 Implement the authorized Windows resident-start path and opt-in pre-guardian launch routing, retain direct fallback with one notice on unverified survival, and keep non-Windows paths direct and `a1 pi` free of resident infrastructure
- [ ] 2.5 Add `ui.js --tab` startup with complete existing A1/Pi/extension text UI, bridge credentials consumed and removed before extension/tool startup, basic readiness/session/status reporting, no outer intro/outro, and safe detach rather than child exit
- [ ] 2.6 Implement attach raw/alternate-screen ownership, minimum one-tab strip, supported keyboard/mouse/paste/focus negotiation, surface composition/offsets, clipboard/hyperlink/cursor behavior, bell suppression, and local double-`Ctrl+C` forwarding exactly the first press
- [ ] 2.7 Demonstrate detached output and retained reattach, terminal-close-equivalent owner-tree kill, forced attach death with surviving-owner restoration, verified resident survival, and safe fallback; collect physical evidence only manually or on an authorized isolated worker

## 3. Failure isolation

Exit evidence: two independent tabs keep working through server loss; holder/child failure, blocked I/O, or a slow client affects only its own failure domain. No duplicate registry writer, session writer, or tab incarnation is created.

- [ ] 3.1 Extend the minimal topology to two independent holders; implement bounded reliable control/single-slot render lanes, full-surface resync after dropped render baselines, and subscriptions only for viewed surfaces
- [ ] 3.2 Implement server recovery under the exclusive writer lease with verified owner termination, durable epoch advancement, derived-credential holder re-admission, stale-event rejection, and three-starts-in-sixty-seconds stop budget without stopping surviving tabs
- [ ] 3.3 Implement shared Windows session-writer admission and custody from milestone 1 across all A1-owned launch/switch routes; prove holder death cannot admit a second writer while a prior writer may survive, and ordinary tools cannot inherit writer/bridge authority
- [ ] 3.4 Implement off-loop deadline-bound spawn/identity/fsync/termination work, independent role watchdogs, holder five-second/three-miss supervision, and graceful-before-forced bounded concurrent tree cleanup
- [ ] 3.5 Implement child heartbeat warning at 30 seconds and restart at the configured default 120 seconds only with healthy supervision evidence; bridge/server outage alone must not kill children; progress stall at 300 seconds offers actions without automatic kill
- [ ] 3.6 Implement incarnation-aware reconciliation for lifecycle/size, one start in flight per tab, and child/holder 1/5/30-second restart backoff with three-in-ten-minutes budget, gated by verified writer/tree exit
- [ ] 3.7 Prove two-tab server kill/re-admission with unchanged holder/child identities, isolated holder/child death and hangs, blocked writes, ConPTY creation hang, stale PID/epoch events, slow clients, and duplicate-start/lease refusal using deterministic and Windows fixtures

## 4. Safe recovery

Exit evidence: submitted prompts are durable before dispatch, unfinished prompts are offered but never resent, healthy continuous typing loses at most one second of draft changes, and corrupt/blocked storage never causes silent resets or duplicate writers.

- [ ] 4.1 Implement the child-owned prompt journal with stable submission IDs, fail-closed durable admission, pre-input reserved session identity, session-entry/synchronized-completion correlation, idempotent retirement, and first-turn recovery before Pi creates its file; do not reuse asynchronous prompt history as the admission barrier
- [ ] 4.2 Implement periodic dirty draft checkpoints during continuous typing, maximum one-second healthy dirty interval, visible degraded recovery on failed/late writes, and session-file synchronization at settled turn/graceful stop
- [ ] 4.3 Implement registry temp-write/write-capable sync/atomic replacement/metadata durability, bounded rename retry and twenty history generations, corrupt quarantine/last-good recovery, and rejected uncommitted mutations while live observed memory remains authoritative
- [ ] 4.4 Implement boot-scoped restore, verified process identity, bounded/spaced starts with at most two by default, missing-cwd/existing-session failures, recoverable reserved first-turn sessions, explicit restoring-client environment, and interrupted prompts offered idle without resend
- [ ] 4.5 Implement bounded seven-day owner-only last-screen recovery; classify any separately available raw stderr as private recovery data with three 5 MiB generations and seven-day expiry; do not scrape stderr from terminal cells
- [ ] 4.6 Implement allowlisted rotated structured diagnostics and distinct crash/watchdog/unrequested-exit records; exclude raw stderr, arbitrary exception strings, prompts, transcript, terminal content and credentials from diagnostics/doctor exports
- [ ] 4.7 Exercise crash points before/after journal commit, dispatch, session append/sync, completion and retirement; test continuous typing, power-loss model, holder/writer races, ten-tab restore/shared profile locks, corrupt-all-history refusal, disk full/rename denial, and sensitive-stderr export exclusion

## 5. Complete tab UX

Exit evidence: the final tab UX and extension text contract work with two clients, delayed input and transfer races; conveniences are added only after milestones 2–4 prove survival and recovery. Recorded auto-name/prewarm/idle defaults remain unchanged.

- [ ] 5.1 Complete bridge sequenced engine-derived status/heartbeat/session/name/interrupted metadata, visibility throttling and needs-input from extension/trust/permission fixtures; missing bridge retains terminal usability and attach-local actions
- [ ] 5.2 Implement the proven causal controller-transfer barrier and immutable command-origin generations; test old buffered `/quit`, queued commands and empty-editor `Ctrl+D` across transfer, bridge loss and reconnect without detaching the new controller
- [ ] 5.3 Complete single-row themed grapheme-width chips, status icons as the only attention signal, overflow picker, `+`, empty state, per-client view, mouse menus/reordering, and controller-owned PTY sizing
- [ ] 5.4 Implement conflict-checked configurable shortcuts (`Alt+A`, `Alt+W`, `F2`, `Alt+1`…`Alt+0`, `Alt+.`/`Alt+,`, `Alt+>`/`Alt+<`), inline/user naming, `/new-tab`, `/close`, `/tabs`, `/quit-all`, `/name`, busy/queued-close confirmation, graceful stop and detach hints
- [ ] 5.5 Integrate resident session selection/focus and conflict-safe direct/fallback resume/switching, preserving unrelated concurrent sessions and comparison-profile behavior apart from the shared Windows writer guard
- [ ] 5.6 Certify text-terminal Unicode, keyboard, mouse, paste, selection, clipboard, hyperlinks, cursor, alternate screen and custom extension components; image requests must use the declared fallback rather than claim image parity
- [ ] 5.7 After survival/recovery evidence, add bounded in-child auto-naming with deterministic fallback and user-name precedence, one standby prewarm, and default 60-minute unviewed idle suspension; preserve drafts/session durability and disclose lost extension in-memory state on suspension
- [ ] 5.8 Measure cold launch, warm tab creation, retained reattach, input-to-process/output-to-present latency and restart separately against declared budgets; do not copy v2 benchmark results or treat prewarm as proof of fast cold reattach

## 6. Packaging and certification

Exit evidence: exact packaged Windows bytes satisfy the complete opt-in contract. All substantive tasks/evidence/gaps must be reconciled before readiness/finalization; maintainer acceptance remains manual and this planning update grants no such authority.

- [ ] 6.1 Build/package the Windows x64 terminal-host through the existing impact-selected Windows CI owner with pinned toolchain/source provenance, artifact hashes, licenses/notices, immutable-release placement and package-content verification
- [ ] 6.2 Retain releases used by live verified servers, holders and tab children through activation, including writer-guard ownership where applicable; keep the compatible resident cohort until its tabs stop, with no automatic handoff or release recycling
- [ ] 6.3 Add `a1 tabs`, `a1 tabs stop <id>|--all`, `a1 tabs host status|stop` and `a1 tabs doctor`; listing absent servers must not start them and doctor must exclude sensitive recovery content
- [ ] 6.4 Complete opt-in/settings controls and hard bounds on tabs, starts, queues, scrollback, recovery files, diagnostics, memory/handles and idle server exit; expose restart/stall/resync/degraded counters and observed detachment mode
- [ ] 6.5 Complete deterministic property/simulation, all persistence/IPC crash points, protocol/surface fuzzing and bounded Windows chaos covering stale authority, client churn, buffered controller transfer, containment, restore, blocked writes, update retention and terminal restoration
- [ ] 6.6 Record exact-package Windows manual or authorized isolated-worker evidence for terminal closure, SSH/session loss, reboot restore, input/render smoothness, extension text UI, two-client attribution, server/holder/child failure, sensitive-data separation and conflict-safe direct rollback; never automate an active workstation
- [ ] 6.7 Document known gaps and deferred gates: separately authorized 24-hour Windows default-on soak, macOS/Linux implementation/certification, automatic resident cohort handoff/recycling, generic CLI admission, split layouts, remote attach, worktree isolation and agent coordination; keep all outside this delivery
