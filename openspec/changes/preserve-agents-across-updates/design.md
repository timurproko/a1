## Context

Release isolation intentionally changed resident discovery to the digest of canonical profile and immutable execution root. `roles/scope.rs` derives that namespace and pins child launches to the originating release. `ensure-terminal-host.ts` probes only the selected release; maintenance similarly refuses to substitute another release. `resident-terminal-host` currently requires a new B launch to use B's independent host and expressly excludes migration. These constraints explain the symptom without establishing that a user's transcript files were deleted.

The update notice tells the older process's user to restart. Activation and release GC preserve live A artifacts, but no profile-level workspace carries A's tabs into B's UI. Simply removing the release digest would reintroduce old-host/new-child custody bugs. Simply reopening session files would conflict with live writer leases, lose active work and drafts, and leave old agents orphaned.

## Goals / Non-Goals

**Goals:**
- A normal post-update launch provides the selected release's workspace and access to every previously open resident Agent in that profile.
- Installation does not interrupt agents. Relaunch schedules migration independently for each Agent once safe, without waiting for all Agents to become idle.
- Exactly one writer and one visible logical tab survive every handoff/crash interleaving.
- Existing supported release-scoped predecessors are discoverable on the first fixed launch; missing migration support never makes them invisible.
- Recovery and retention remain bounded, owner-only, exact-identity verified, and restart-safe.

**Non-Goals:**
- In-process hot swap, copying active model/tool memory, or silently aborting an unfinished turn.
- Reverting release-isolated host/holder/bridge authority to one mutable global host.
- Cross-user/profile routing, arbitrary executable adapters, pre-cutover private-contract migration, or modifying retained release payloads.
- Automatic adoption of direct solo/external writers, reboot/logout restoration, or changing public profile/session paths.
- Restoring process-local extension state that offers no supported checkpoint contract; such state blocks migration rather than being silently discarded.

## Decisions

### 1. Separate durable workspace identity from execution custody

Add an owner-only, lease/epoch-protected profile workspace index independent of immutable release. It stores logical tab identity, display name/name source, order, selection, source namespace and tab identity, source/target immutable identities, and bounded handoff metadata. Credentials, environment values, prompt/transcript text, terminal cells and drafts do not belong in this index. Sensitive checkpoints remain in existing private recovery storage.

Each release-local registry stays authoritative for its own processes and is mutated only through that host. A qualified source identity prevents colliding local tab IDs from collapsing. Concurrent launches converge on one workspace writer; index damage uses last-good recovery or reports blocked recovery, never a new empty workspace. Existing source records are imported idempotently after profile/namespace verification without overwriting another release's registry. Explicitly closed/stopped tabs and hidden prewarm are not resurrected.

Persist selection and user ordering separately from automatic migration. Agent logical identity survives process replacement; singleton utilities execute on the selected release and do not duplicate per source cohort. A new Agent always starts on that selected release even while another tab still executes old code.

### 2. Reconnect first through explicit source routes

The selected release owns the workspace UI. It discovers supported retained source releases using bounded verified release/state discovery, recomputes their namespace from the exact canonical profile and immutable release root, verifies native process/start and boot/login identities, and authenticates each source connection with that namespace's owner-only authority.

A source-route adapter explicitly binds one expected source release, endpoint, namespace and permitted attach/control methods. It verifies that identity before optional presentation negotiation and preserves the source's controller-generation barriers. This is the only cross-release client route; it does not admit foreign holders or bridges, supply arbitrary Node/argv paths, change generic wrong-release fallback, or claim that source and destination releases are equal. Holder recovery and child restart remain pinned to their original code until an acknowledged handoff changes the logical tab's destination.

Aggregate live surfaces, status, input, resize, rename and close into the updated workspace using source-qualified routing. Keep terminal bytes in the native data path. New-tab and utility actions go to the selected release, not whichever older source owns the current view. Disconnection leaves a visible recovering/blocked entry with retry; it must not erase a tab or create a second Agent from its session file.

### 3. Migrate processes only across an acknowledged safe boundary

Relaunch triggers background per-Agent handoff to the verified selected release. Installation/activation alone never terminates an Agent. A busy Agent continues its current turn with unchanged process identity and remains fully controllable in the new workspace. Migration starts only when the source atomically freezes new admission and acknowledges a quiescent checkpoint: no active model/tool turn, pending extension/trust/permission interaction, uncheckpointed queued input, or unpersistable runtime state. A stale `idle` status snapshot is not that acknowledgement.

The source synchronizes settled session entries, draft and prompt-journal state, queued-input identity, session/model/thinking configuration and supported checkpointable state. Freeze and checkpoint must account for every attached controller, not only the terminal that requested relaunch. Migration preserves original cwd/session locations and intentionally selected settings; credentials and environment are reconstructed through the ordinary validated launch contract rather than copied into public workspace metadata.

Durably prepare a transaction before the source may exit. The source fences its automatic restart/admission for this transfer; only then can it gracefully release its writer. Verify the exact previous child/tree exit and acquire the profile-neutral OS session-writer lease before starting the target writer. The target is a new process under target release custody, not an old holder repointed at arbitrary code. Preserve the logical tab while switching its committed workspace destination after target readiness.

A queued but undispatched prompt remains queued/offered according to its durable identity; a dispatched or uncertain submission is never automatically resent. A reserved first-turn session with no Pi file must retain its journal/reservation identity. Draft attachments and any required private artifacts must be retained or produce an explicit blocker, not quietly degraded.

### 4. Make transfer a recoverable transaction, not a registry copy

Use a stable handoff ID and explicit phases such as prepared, source-quiesced, source-released, target-starting, target-ready, committed and blocked. Bind source/target roots, namespace/epoch/incarnation, logical tab/session identity, checkpoint references and observed process identities. Do not store secrets or content in transaction diagnostics. Every phase and external effect is retry-safe and fenced against stale actors.

Before source release, failure unfreezes the original Agent and keeps its workspace route. After release, recovery reconciles both namespaces, actual process identities and writer locks before starting or reconnecting anything. If the target is already alive, reconnect it instead of duplicating it. Source restart cannot race target admission. If target launch fails, the visible logical tab offers retry or a verified source resume only after proving the target cannot still write. No outcome silently replaces the workspace with an empty tab list.

Multiple launches, server/holder/client death and another update during migration require one transaction owner and one deterministic destination per handoff. An in-flight transfer stays bound to its recorded verified target; a later activated version can schedule a subsequent transfer only after reconciliation, never rewrite target authority mid-flight. Timeouts become per-tab pending/blocked outcomes and do not block UI input or other migrations.

Pending source/target roots, checkpoints and reconciliation obligations are explicit GC holds, even during the interval when no process is live. Remove them only after committed destination/rollback custody and private-artifact retention are settled. Existing conservative holds on unreadable state or unavailable identity inspection remain.

### 5. Handle already installed predecessors honestly

The first fixed release must exercise discovery and normal attach/control against actual supported published release-scoped predecessors. Existing protocol paths can restore access without modifying an installed old process. Do not require a new migration feature merely to list or control an existing compatible source tab.

Automatic quiesce/transfer is separately negotiated. A predecessor without a safe checkpoint/fencing acknowledgement remains accessible on its recorded release with an explicit pending reason; it is not killed based on a sampled idle flag. Normal verified resumption on the target becomes possible after that source writer exits. Unsupported generation/private-contract or unavailable source artifacts produce a visible recovery entry and bounded actionable guidance, not arbitrary old code execution, state deletion or an empty-workspace success. This compatibility limit must be stated in handoff rather than claiming every historical release can upgrade its live memory.

### 6. Keep version and progress truthful

Show whether an Agent is finishing on its source version, transferring, running on the target, or blocked with retry/recovery. A selected-release workspace header does not certify that every child has migrated. Keep existing working/attention state and copy-feedback geometry; migration progress must not obscure a permission request or steal editor focus. Once the target Agent is running, it must not show stale restart readiness for that target. Existing Notify/No behavior and explicit update output remain unchanged.

## Alternatives Rejected

- Remove release isolation or reuse any matching-generation host: restores apparent visibility but can execute the wrong code and weakens custody.
- Reopen every session immediately: races live writers, interrupts turns, loses drafts and may duplicate prompts.
- Kill/restart all Agents on activation: makes a background update destructive and cannot preserve active tool/model memory.
- Only launch the entire old UI: preserves access but does not deliver an updated workspace or progressive Agent upgrades.
- Require every old Agent to terminate before launching the new UI: repeats the continuity failure and blocks on legitimate long-running work.

## Risks / Trade-offs

- Mixed-version routes add complexity. Keep release equality checks as the default and isolate the explicit workspace path with negative credential/profile/endpoint tests.
- A source without migration support cannot supply a trustworthy atomic idle barrier. Restore access first and report the pending limit instead of using timing guesses.
- Extension/UI state may not serialize. Treat unsupported state as a visible migration blocker, not permission to discard it.
- Writer custody crosses multiple processes. Inject death before/after every durable phase and launch/exit boundary, including late source recovery.
- Retention can grow while an old Agent remains busy or blocked. Prefer retained artifacts over orphaning live work; expose the reason and release them after safe completion.

## Validation Plan

- Deterministic workspace/routing/transaction tests: two sources with colliding IDs, concurrent relaunch, source status races, controller transfer, stale epochs/incarnations, busy/needs-input/queued states, target changes and every interrupted phase.
- Process-level source/target fixtures: verify live input/output and unchanged busy Agent identities after update, then exactly one target writer and unchanged session identity after safe migration. Cover drafts, first-turn reservations, queued submissions, attachments, model selection and prompt non-replay.
- Exact-package update/relaunch tests on Windows x64, Linux x64 and macOS arm64, with real published predecessors and the candidate as target; two candidate copies do not establish predecessor interoperability.
- Retention tests with no live process during a prepared transfer, corrupt/linked records, unavailable process inspection, target failure and verified rollback. Secret-free index/diagnostics and private checkpoint boundaries remain assertions.
- Focused UI checks for preserved tabs/order/selection, usable busy tabs, accurate source/target state, explicit recovery entries and no empty-workspace success on failure. Reconcile architecture docs during implementation.
- Before push, use only typecheck, changed test files and strict OpenSpec validation. Ready-PR CI owns selected platform/exact-artifact validation; no broad local suites or production-agent termination.

## Approval and Known Limits

Planning only; implementation, test execution and production recovery are not performed by this proposal. The requested scope explicitly changes the prior no-automatic-handoff policy while retaining release-local execution authority. Immediate live-code conversion of an unsupported predecessor or an in-progress turn is not promised; immediate access and truthful pending recovery are required instead. Detailed implementation tasks remain unchecked until plan approval and an explicit implementation request.
