# Design

## Context

See `proposal.md` for motivation and the capability deltas for observable behavior.

Direct `a1 solo` connects the owned TypeScript terminal runtime to the user's terminal. Resident `a1` inserts four boundaries: the native attach client decodes outer events, the server attributes them to a viewed/controller tab, the holder writes them through that tab's PTY while parsing output into libghostty-vt, and the attach client renders the retained surface below its strip. The owned child is otherwise the same A1 UI.

The current implementation has useful component coverage but no oracle across that complete chain. Key encoding unit tests do not prove that `Ctrl+V` invokes the child paste action. The fidelity probe creates OSC 52 but does not prove that a child clipboard write consumed by the holder reaches the outer terminal. The background-rendering fixture proves retained state advances, but not that several real A1 render schedulers remain live while the user switches. Double-`Ctrl+C` tests call its state helper rather than driving supported terminal events through attach.

The attach loop also owns tab state and paints strip, surfaces, notices, and cursor updates through separate writes. Server topology acknowledgement, holder subscription, and the target's complete surface arrive separately, so eager view mutation can make a new active chip visible over the previous child before the target surface arrives. Draft PR #791 plans a compatible requested/committed presentation model for overlapping strip work and currently belongs to another live worktree.

## Goals / Non-Goals

**Goals:**

- Establish one durable parity boundary: once attach-owned tab actions are removed, the viewed child receives the same semantic inputs and produces the same supported terminal effects as direct A1.
- Exercise real process and protocol boundaries rather than infer parity from isolated encoders or final screenshots.
- Preserve independent progress and bounded resources for every holder and child while several agents stream.
- Make attach presentation state coherent even when topology, status, surfaces, input, and lifecycle results interleave.
- Keep direct A1 as an unchanged oracle and keep diagnostics free of prompt, transcript, selection, and clipboard content.

**Non-Goals:**

- Pixel-identical comparison of the resident strip with direct A1, because direct A1 has no strip.
- Changing owned prompt, viewport, clipboard, dialog, extension, or shortcut semantics merely to accommodate the resident host.
- Making unsupported inline image protocols cross the resident text-terminal boundary.
- Replacing controller fencing, process isolation, session-writer leases, or the one-visible-surface transport model.
- Claiming that synthetic PTY evidence replaces required exact-package or physical-terminal platform evidence.

## Decisions

### 1. Treat direct A1 semantics as the oracle, not raw output bytes

A parity case will define an input script and compare semantic observations: admitted key identity, editor/action result, selected/copied text digest and length, paste count, pointer target, dialog state, child cell snapshot, cursor/modes, and timing class. Resident coordinates normalize by removing exactly one strip row. Volatile status animation, timestamps, process identities, and the declared resident-only differences are normalized explicitly rather than hidden through broad snapshot filtering.

This avoids a false requirement that two architecturally different terminal paths emit identical escape fragmentation. It still detects visible cell, cursor, ownership, clipboard, action, and latency differences.

**Alternative considered:** compare only final screenshots. Rejected because duplicate input, delayed streaming, stale intermediate frames, lost controls, and a UI freeze can all end at the same final snapshot.

### 2. Build one parity matrix with three evidence layers

The matrix will be data-driven and shared by:

1. **Owned-shell oracle tests** that run the existing solo input/presentation path with deterministic clipboard, clock, provider, and extension fixtures and record content-free semantic observations.
2. **Native role integration** that drives actual attach/server/holder/PTTY processes, with a certified fixture child that records normalized event kinds and emits deterministic cells, modes, hyperlinks, clipboard requests, and streaming checkpoints.
3. **Exact-package platform runs** that launch direct and resident candidates under a real pseudoterminal/ConPTY and execute the safe subset of the same matrix, including simultaneous tabs and terminal restoration.

The matrix covers prompt editing and modifiers, completion/history, effective shortcuts and help, prompt/transcript/frame selection, copy/cut/paste, mouse and focus, dialogs and extension text UI, attachment entry, resize, streaming, switching, detach, and mode restoration. Evidence records case identity, candidate, platform, terminal dimensions/capabilities, event/result categories, and durations; it never records user content or clipboard payloads.

**Alternative considered:** add one regression per reported key. Rejected because that repeats the current gap: each new symptom would need a user report before the untested boundary is discovered.

### 3. Preserve semantic input until the holder's terminal-mode boundary

Attach will continue intercepting resolved tab actions first. For all other input, it will produce a bounded normalized event carrying key code/text, Ctrl/Alt/Shift identity, press/repeat semantics, paste transaction, focus, mouse coordinates/button/kind, or resize. The server will attribute and fence that event without converting it. The holder, which owns the child terminal model and therefore knows its active input modes, will perform the final child encoding.

The event form will be additive in generation 1 and advertised as a feature. Exact-package peers require it for parity. A same-generation older host may retain the existing byte path only as an explicitly negotiated compatibility fallback; it cannot be certified against the new parity contract. Paste remains separately reserved and chunked so one accepted paste cannot partially enter the child.

Double-`Ctrl+C` recognition occurs on the normalized outer key before child encoding. Non-C input categories reset the chord according to the clear/exit contract. The first C event is encoded once for the child; the qualifying second event is consumed by attach.

**Alternative considered:** keep expanding hand-written byte mappings in attach. Rejected because attach cannot correctly encode every supported event against terminal modes owned by another process, and byte equality is too late to identify some semantic chords reliably.

### 4. Forward terminal side effects as typed holder effects

Libghostty-vt already exposes semantic callbacks and model state for clipboard writes and terminal effects. The holder will collect bounded effects separately from visible cell damage. Effects that belong to the currently viewed tab will cross a dedicated bounded control shape to attach; hidden-tab effects update retained state but cannot mutate the outer terminal.

Clipboard writes will carry validated location and bounded MIME/text bytes long enough for attach to emit the supported outer protocol once. Notifications and BEL remain denied by policy. Hyperlinks remain cell attributes. Cursor shape/visibility and relevant interaction modes become part of the complete presentation state so view changes apply the target state and detach restores attach-owned outer modes.

**Alternative considered:** pass raw child output around the terminal model to preserve OSC sequences. Rejected because it would duplicate terminal parsing, leak hidden-tab side effects, make replay unsafe, and violate the retained-model architecture.

### 5. Commit requested views only with a complete current presentation

Attach will separate requested view from committed view. A create, click, shortcut, close successor, recovery, or server-driven removal may change the request immediately, but the visible selected chip and body commit only when attach has a topology containing the target plus a complete target surface and mode snapshot. Superseded requests are discarded by identity/revision.

One compositor will derive strip, complete or valid incremental child surface, overlay, mode changes, and final cursor from current committed state. It will emit one locked write bracketed by synchronized-update markers where supported. A terminal that ignores synchronization still receives no clear-only or contradictory component-only write. Strip-only damage remains possible only when it cannot contradict body/view state and uses the same compositor authority.

This decision will consume the equivalent implementation from PR #791 if it reaches `develop` first. If #791 remains open when implementation begins, consolidation requires explicit maintainer coordination; this change will not edit or cherry-pick from its busy worktree.

**Alternative considered:** immediately repaint the strip and wait for the target surface. Rejected because that is the observed stale-body/flash window.

### 6. Keep progress independent at every resident role

Each holder continues draining its PTY and feeding its terminal model whether viewed or hidden. Child-owned render scheduling is never visibility-gated. Subscription controls only surface serialization/delivery. Server client connections retain a reliable bounded control lane and replaceable render lane, while each holder and child remains a separate process and queue.

The implementation audit will trace timestamps at these content-free boundaries: child render request, PTY write/read, model update, subscription full-frame request, server offer, attach receipt, and outer commit. The traces distinguish a child render pause from holder, server, or attach delay. Multi-tab stress uses independently stamped fixture output so a settled result cannot masquerade as continuous streaming.

**Alternative considered:** always serialize and broadcast hidden surfaces. Rejected because it wastes CPU and bandwidth; retained terminal-state progress, not hidden delivery, is required.

### 7. Make shortcut parity declaration-driven

The resident tab resolver will consume the same effective A1 keybinding projection used by child dispatch and help, plus the Tabs declarations. Conflict checking produces one explicit disabled tab action rather than relying on separately parsed raw JSON keys. Attach consumes only an active tab action; all other normalized events continue to the child unchanged. `/hotkeys` and other help remain child-owned for A1 actions and add a separately sourced Tabs section.

**Alternative considered:** maintain the native hard-coded defaults and approximate conflicts from JSON. Rejected because dispatch and presentation can drift from A1's effective platform/profile/customized declarations.

### 8. Performance assertions are causal, bounded, and platform-specific

Parity cases pair each expected observation with its own event identity and send timestamp. They fail duplicate, stale, negative, missing, and completion-only samples rather than dropping them. Interactive input, isolated echo, selection paint, clipboard admission, switch-to-current-surface, and streamed update each receive a declared bound consistent with existing resident latency budgets. High-rate tests check bounded queues and latest-state coalescing instead of requiring every intermediate visual frame.

Platform results remain separate for Windows x64, Linux x64, macOS arm64, and macOS x64. CI or physical evidence from one platform cannot certify another.

## Risks / Trade-offs

- **[The parity matrix becomes too broad to diagnose]** → Keep cases atomic, identify every boundary timestamp, and report the first semantic divergence rather than one monolithic screenshot diff.
- **[Typed input expands generation-1 protocol surface]** → Use additive named fields, feature negotiation, exact fixtures, strict bounds, and fuzz corpus updates; retain a clearly non-certified legacy-byte fallback for older same-generation cohorts.
- **[Clipboard forwarding could expose sensitive payloads]** → Keep payloads only in bounded in-memory control frames, prohibit logs/diagnostics, validate location and size, and test evidence using digests/lengths and synthetic content.
- **[A hidden tab could affect the outer terminal]** → Retain semantic state per holder but authorize outer effects only for the currently committed view and revision.
- **[Waiting for a complete target surface adds switch latency]** → Keep the old coherent frame while the bounded full-surface request runs, prioritize user-requested subscriptions, and enforce the existing reattach/switch latency budget.
- **[PR #791 overlaps presentation work]** → Reconcile from `develop` when delivered; stop for explicit maintainer consolidation rather than produce parallel conflicting implementations while its worktree is live.
- **[Synthetic evidence passes while a physical terminal differs]** → Keep exact-package per-platform and user-controlled physical acceptance obligations; do not infer terminal behavior solely from PTY fixtures.
- **[Full parity accidentally changes solo A1]** → Treat solo output and action traces as immutable oracle fixtures; product edits target resident/native boundaries unless a separately approved baseline defect is discovered.

## Migration Plan

1. Add parity fixtures and observations without changing production routing, establishing failing resident cases against the unchanged direct oracle.
2. Add feature-negotiated normalized input and typed terminal effects while preserving bounded generation-1 compatibility.
3. Move final event encoding to holders and repair clipboard, selection, shortcut, focus, and detach paths case by case.
4. Introduce or reconcile the requested/committed compositor and remove superseded eager/separate paint paths.
5. Extend concurrent and pressure cases, then run exact-package platform validation through normal CI.
6. No persistent user data migration is required. Rollback selects the previous immutable release; live resident cohorts remain on their existing release until their tabs stop under current cohort policy.
