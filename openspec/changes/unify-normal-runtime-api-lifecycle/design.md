## Context

See proposal.md for intent. The maintainer explicitly requires exposed APIs to work independently of normal versus compatible launching, not a compatible-only color patch.

Inspection baseline: `origin/develop` / `9ff23838b7f39a663655dfaaf3d006f83e0be096`. `bin/pi-compatible.js` prepares the normal `a1` launch intent and uses the supported immutable bootstrap. `src/features/launch/runtime-selection.ts` selects `productMode: bare` for that profile. `bin/ui.js` reserves the runtime/Herdr context before composition; both entrypoints then use `composeOwnedUi`. The compatible entry is not the distinct `a1 pi` comparison profile.

### Diagnosed shared availability defect

- `src/features/owned-ui/herdr-binding.ts:32-37` gives the sole early reservation about 250 ms to acquire its per-terminal lock.
- `withHerdrBinding` holds that same lock across the reporter's Core read, Core label write, settlement and publication-record write. Each command can spend 200 ms resolving, 750 ms executing and 250 ms settling. A normally settling transaction can outlast the reservation budget without a crash or stale lock.
- `bin/ui.js:31` retains an undefined reservation on timeout. `startSessionColorControl` creates its reporter only when the reservation's runtime matches the endpoint runtime. There is no later reservation attempt, so release of the legitimate predecessor lock cannot restore this successor's publication path.
- Existing tests cover reservations before either publisher starts, older callbacks and permanently unsettled writes. They do not cover a successor arriving during a legitimate in-flight publication.

A disposable, ignored investigation fixture invoked the real source reservation/guard functions, acquired the predecessor guard, attempted the successor while that guard was held, released the predecessor normally, and successfully reserved another runtime afterward. Actual result:

```json
{"successorReserved":false,"elapsedMs":274,"laterGeneration":2,"lockResidue":false}
```

The liveness assertion requiring the successor's eligibility failed with exit 1. No Core command, live terminal, process restart, user coordination inventory or private endpoint record was involved. This proves a shared ownership-boundary defect; it is not an end-to-end compatible-launch reproduction. Outcome 2 adds a tracked fail-before/pass-after regression, and outcome 3 must exercise actual launch wiring.

The historical pc2 labels and process observation are supplied evidence only. They were not revalidated here, and the exact reason that particular immutable runtime failed to report remains unknown. Endpoint failure, unavailable Core, launch context, foreign labels and crash residue are still possible. Do not claim that this contention finding diagnoses that live process or that deploying new code repairs it in place.

## Goals / Non-Goals

**Goals**

- Treat both launch grammars as adapters into the same normal-product API lifecycle.
- Give existing control and reporting owners the same immutable runtime identity, readiness and cancellation lifetime, independently of asynchronous extension startup.
- Preserve ordered successor eligibility through ordinary Core publication contention without relaxing any ownership or consumer check.
- Demonstrate the complete compatible producer and membership-driven consumer contract on disposable infrastructure.

**Non-goals**

- Identical CLI grammars, a `session color` command added to the Pi-compatible parser, new API operations or a new universal API server.
- Enabling product APIs in comparison `a1 pi`, changing profile isolation or unsupported/noninteractive behavior.
- Automatically recovering persistent lock/crash residue, clearing foreign labels, repairing current user sessions, modifying Firstmate or deploying Custom changes.
- Adding terminal injection, PTYs, desktop automation, a resident helper, a network listener or remote companion.

## Decisions

### 1. One normal-product integration context and lifecycle

Capture an explicit immutable runtime context once at independent UI entry, before loading extension factories. It contains the process runtime UUID and the validated integration context/early ownership intent needed by the existing owners. The environment may still transport the existing shell identity to child helpers, but late API startup must not derive a second identity by rereading mutable environment values.

Pass the same context to the existing session-runtime/worktree registry and color/reporting integration. Preserve standalone/test composition through an explicitly created local context, never a machine-wide current session. Keep ordinary and compatible parsing at their current launch owners; neither launcher starts a publisher of its own.

A focused lifecycle collaborator under `src/features/owned-ui/` owns integration state and cancellation; composition constructs it and connects typed endpoint, backend, settings and Core ports. Neutral foundation transport remains product-agnostic. Reuse the existing endpoint and reporter implementations, refactoring their lifecycle seams as needed rather than introducing parallel services. The lifecycle covers preparing, endpoint-ready, ownership-pending, reporting, superseded/blocked and disposed states. Endpoint-ready and reporting-ready are distinct: unavailable reporting must neither break the UI nor advertise a usable binding prematurely.

The API contract is launcher-independent, not merely a hardcoded color exception. A normal-product session exposes its existing API set by product capability/context. Representative parity coverage includes color list/capabilities/get/set, session/worktree attachment and built-in tool cwd, current shell session metadata, replacement and teardown. Public JSON command names, schemas and errors remain unchanged. Help/version/catalog retain their existing noninteractive contracts and known Firstmate-scoped catalog refusal; this is not a promise to remove unrelated compatibility restrictions.

Rejected alternatives: checking executable names in consumers; interpreting `pi-compatible` as comparison; copying endpoint/reporting startup into each entrypoint; adding special-case API proxies. They create the very launcher-dependent behavior the maintainer rejected.

### 2. Separate ordered launch intent from slow publication settlement

A larger one-shot wait only changes the race window. Retrying an unordered reservation after startup could let an older delayed runtime supersede a newer one. Therefore use two distinct coordination responsibilities within the current safe per-user/per-terminal boundary:

1. **Short intent ordering:** record an immutable monotonic launch-intent ticket using a small local metadata transaction, never while holding Core I/O. A later ticket permanently supersedes earlier pending tickets. An intent is not authority to publish or to claim endpoint readiness.
2. **Existing I/O settlement fence:** retain the existing guard across public reads/writes, acknowledged-publication lineage and verified settlement. Publication authority is promoted only under this guard, after checking the latest intent and current committed owner. Do not run any Core write through the metadata-only path.

If a normally held I/O fence is busy, retain only the latest eligible pending intent and retry bounded promotion on the existing approximately 30-second refresh cadence or a coalesced committed replacement. Each attempt is finite; there is one timer and one pending job per runtime, not a rapid polling loop, watcher or second reporter. Do not block first paint waiting for Core settlement. Once the predecessor settles, the latest still-active, endpoint-ready intent can promote and publish without a relaunch. Disposal cancels pending promotion. A superseded ticket is terminal and cannot reserve again after a successor exits.

Keep intent ordering and the last acknowledged public binding logically separate. A predecessor write already in flight must settle under the existing I/O fence; record its exact acknowledged labels for the successor's ownership comparison even if a newer intent arrived meanwhile. Never write a stale captured ownership record over a newer ticket or reset the previous publication lineage. Recheck current intent, endpoint session generation and stopped state after awaited public reads and immediately before issuing a label mutation. A superseded in-flight write can finish before successor promotion, but cannot overwrite an already-published successor because both share the I/O guard.

Reuse the existing guard pathname and honor its locks. Compatible evolution of existing records must happen only under that guard, retaining the monotonic committed generation and exact publication tuple that older participating reporters understand. New intent ordering is private coordination, not an external file API. A pending ticket cannot promote over a different, newer committed owner that appeared since its reservation. Mixed old/new fixtures must cover a legacy reservation or publication between ticket creation and promotion, and a late legacy callback after promotion. If record provenance cannot be reconciled, report blocked internally and preserve data; do not infer ownership from label age. Older installed code is not retroactively fixed.

Crash residue and unsettled writes remain a fail-closed availability limit: retaining a pending intent is not permission to remove a lock or start a concurrent write. No age/PID stealing, automatic record reset or label-based takeover is included. Any crash-recovery redesign requires a separate presented scope decision before implementation.

### 3. Endpoint readiness gates complete native identity

Keep one color endpoint per runtime and the existing session binding generation. Only its successfully published active history/session identity can flow to the reporter. Changing session invalidates reporting eligibility until that endpoint publishes the replacement; multiple replacement triggers coalesce. A failed endpoint never yields new usable labels. Keep all three native keys in one supported `hc label` invocation, the normal heartbeat, exact-owner cleanup and serialized bounded disposal.

Use the same settings path as Current color. A successful set acknowledges only after the live UI applies it. Neither control nor membership changes replace the invocation's initial-color policy, write Default color, change extension/profile state or recolor peers.

### 4. Consumer remains unchanged; membership is not startup environment

A1 reports its ready identity, not its containing space's color. The existing Herdr consumer owns current topology, freshness, named palette mapping and per-machine routing. A tab move does not change the producer runtime or require reinitialization; the consumer must select the destination from current space/tab membership and acknowledged adoption labels, including inactive panes.

Fixtures must preserve native precedence, refusal of partial native identity, 90-second TTL, five-second future tolerance, exact session/runtime, short request expiry, current terminal/space/tab membership and acknowledged get/set results. An old capture after a move, delayed adoption acknowledgement, moved-again target or replaced session must be skipped or rejected without selecting another session. The public consumer has no atomic membership-and-set operation; do not claim to close a move that happens after its final membership check and before an already-admitted set. Preserve the existing recheck boundary rather than weaken it or invent transactional guarantees.

Use an A1-owned hermetic fixture of that documented consumer contract, informed by read-only inspection of Custom's canonical `session-sync.js` and `session-color.cjs`. Do not depend on an absolute customization-checkout import in committed A1 tests, copy a second production consumer, or change/deploy consumer source. If producer correction does not satisfy the current consumer, stop and present the extra project scope for approval.

### 5. Real launch wiring, not a fabricated identity

The end-to-end fixture must execute the packaged compatible parser/entry, authenticated bootstrap transport and independent UI entry through shared composition, with disposable profile/runtime/Core contexts. Replace external terminal/model/Core ports, not runtime identity or lifecycle wiring. An actual loaded fixture extension may delay startup and replace sessions; it must not access Firstmate state or make network/LLM requests. A fixture transport or neutral terminal is preferable to a real desktop/PTY, which is outside authorization.

Exercise a fresh compatible start and same-terminal successor, then connect the reported identity to supported color commands and the consumer fixture. Test local and routed remote topologies, inactive panes, membership acknowledgement delays and unchanged peers. A composed fake endpoint/reporter test alone cannot satisfy this outcome. Test seams must stay narrow, typed and injected at real external boundaries rather than add a production diagnostic mode or bypass selected-release authentication.

## Risks / Trade-offs

- Separating intent and settlement adds coordination state and compatibility complexity → retain the existing I/O guard, atomic bounded metadata, exact publication lineage, monotonic generations and mixed-runtime regression cases; refuse unverifiable transitions.
- A persistent old fence still prevents reporting → preserve this documented safety limit. This plan does not promise every stale identity can be automatically replaced.
- Startup must not await slow Core calls → order local intent early, start endpoint normally and defer bounded promotion through one existing cadence.
- A correct shared lifecycle may not explain the historical incident → keep that uncertainty explicit; additional production defects require reproduction and an approved coherent refinement, not guessed patches.
- A mirrored consumer fixture can drift → tie assertions to the documented unchanged contract and canonical-source inspection, without weakening the consumer or claiming deployed UI certification.
- Optional integration failures remain nonfatal → maintain internal typed states for tests and diagnostics without changing existing public JSON schemas or generating startup warnings.

## Migration Plan

This draft changes no runtime behavior. After explicit plan approval and an implementation request, continue the same PR, delivering its three outcomes in order with matching task-group and PR progress ticks.

New code must coexist safely with participating old runtimes under the unchanged settlement guard; unknown/unsafe metadata or a retained lock remains blocked rather than migrated by force. There is no migration of user settings or consumer deployment. Rolling back leaves unknown new metadata inert and retains old fence semantics; fixtures must ensure an older callback cannot reclaim a newer committed generation. Do not delete new coordination records as a rollback action.

Integration, publication and user-controlled update/relaunch are separate later actions. New code does not hot-patch an already running immutable release. No agent restart, live tab move, label repair or session relaunch is authorized here.

## Validation and investigation evidence

Planning inspection only; no production or tracked test edits:

- A fresh attached task worktree was created from fetched `origin/develop`; no related open delivery was found. Primary and unrelated task copies were not edited.
- The bounded startup cleanup sweep retained the unregistered `firstmate-launcher-integration` and `simplify-change-delivery` checkouts and their checked-out branches. Nothing was removed.
- Dependency installation used the task checkout. Baseline core build and source/bin typecheck passed.
- Existing focused tests passed: `herdr-binding.test.ts` (3), `herdr-reporter.test.ts` (12), `herdr-readiness.test.ts` (2), `pi-compatible.test.ts` (16): 33 total. These passes do not cover the newly demonstrated contention defect.
- The disposable ownership-boundary liveness probe failed as expected, with the exact result above. Its scratch source is ignored under this task's `.artifacts/investigation/`; a tracked regression remains part of outcome 2.

After approval, use only affected test files, typecheck and strict change validation. Likely selections are `test/cli/pi-compatible*.test.ts`, `test/composition/pi-compatible-lifecycle.integration.test.ts`, `test/composition/herdr-{colors.integration,readiness}.test.ts`, `test/composition/session-colors.integration.test.ts`, `test/features/owned-ui/herdr-{binding,command,reporter}.test.ts`, and directly affected runtime-context tests. Add only the missing focused launch/move regressions. No preflight, directory-wide/full/release suite, physical desktop automation, private live inventory or live mutation is authorized. Report actual results and remaining fixture/live gaps; baseline passes are not implementation or deployment acceptance.
