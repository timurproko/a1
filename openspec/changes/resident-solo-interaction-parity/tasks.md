# Tasks

## 1. Differential parity foundation

- [ ] 1.1 Add a data-driven interaction matrix and content-free observation/comparison model for keys, actions, prompt state, selection, clipboard effects, cells, cursor/modes, streaming checkpoints, and latency; verify focused schema/comparator tests reject duplicate, stale, negative, missing, completion-only, and non-normalizable observations.
- [ ] 1.2 Add deterministic direct-A1 fixtures for clipboard, provider streaming, clock, prompts, dialogs, extension text UI, shortcuts, and attachments; verify focused owned-shell tests produce stable semantic oracle observations without changing solo behavior.
- [ ] 1.3 Extend native role integration with a certified PTY child and attach driver that records normalized inputs and emits deterministic cells, modes, hyperlinks, clipboard effects, and stamped partial frames; verify focused fixture tests exercise actual attach/server/holder process and framed-protocol boundaries.
- [ ] 1.4 Add exact-package direct-versus-resident platform harness entry points and artifact checks for the safe matrix subset; verify focused harness tests use built candidate paths, separate platform verdicts, bounded deadlines, and sanitized evidence rather than source launchers or final screenshots alone.

## 2. Semantic input and shortcut routing

- [x] 2.1 Add bounded generation-1 normalized key/text, paste, focus, mouse, and resize protocol shapes plus capability negotiation and legacy-byte fallback; verify focused protocol round-trip, malformed-frame, feature-negotiation, allocation-bound, and fuzz-corpus tests.
- [x] 2.2 Normalize supported outer terminal events in attach before byte encoding, resolve tab actions first, and detect double `Ctrl+C` from semantic key identity; verify focused attach tests drive real supported event representations and prove one first-child delivery, qualifying second-press detach, timeout/reset behavior, and complete terminal restoration.
- [x] 2.3 Route normalized events through server controller/view fencing without conversion, duplication, or cross-tab attribution; verify focused role tests cover concurrent view change, controller takeover, disconnect, stale epoch, and in-flight ordering.
- [x] 2.4 Encode normalized events at each holder against that child's current terminal modes and make admitted paste atomic across transport frames; verify focused Ghostty/holder tests cover default and enhanced key modes, Unicode, Alt/Ctrl/Shift combinations, focus, mouse, resize, multiline paste, rejection, and exact-once PTY writes.
- [x] 2.5 Project effective A1 and customized `keybindings.json` declarations into resident tab resolution and shortcut presentation, with child and Tabs ownership kept separate; verify focused TypeScript/native tests cover defaults, remaps, conflicts, disabled tab actions, `/hotkeys`, help, dialogs, footer hints, and unmatched forwarding.

## 3. Selection, clipboard, and terminal effects

- [ ] 3.1 Preserve direct child ownership for prompt, transcript, status/footer, dialog, extension, double/triple-click, reverse-drag, and scrolling selection while excluding the resident strip; verify focused direct-versus-resident matrix cases compare painted cells, copied semantic text, padding exclusion, and selection clearing.
- [ ] 3.2 Register bounded libghostty-vt clipboard-write handling and add a typed holder-to-attach effect path authorized only for the committed viewed revision; verify focused tests cover OSC 52/iTerm2 normalization, fragmented writes, MIME/location validation, size limits, hidden tabs, disconnects, and prohibition of payload logging.
- [ ] 3.3 Apply viewed clipboard, hyperlink, cursor shape/visibility, focus, mouse, keyboard, alternate-screen, and synchronized-presentation effects at attach and restore attach-owned modes on every exit; verify focused role tests compare emitted outer effects with direct behavior and fault-inject detach, server loss, protocol error, and write failure.
- [ ] 3.4 Repair first-use Ctrl+V and outer-terminal bracketed/right-click paste through the parity boundary without duplicate transport or takeover gestures; verify focused platform-aware matrix cases cover startup, Unicode, multiline, capacity rejection, clipboard busy/unsupported outcomes, and immediate post-switch use.

## 4. Independent multi-agent progress

- [ ] 4.1 Audit and remove viewed-tab gating from child render scheduling, PTY draining, terminal-model updates, and retained state while keeping hidden surface delivery unsubscribed; verify focused tests observe independently stamped partial progress from every hidden and viewed child.
- [ ] 4.2 Isolate holder draining, server control, replaceable render offers, attach input, and lifecycle operations with bounded queues and deadlines; verify focused pressure tests cover a slow client, high-rate output, stalled spawn/termination/persistence, bounded memory, latest-state coalescing, and unaffected interactive input.
- [ ] 4.3 Add multi-tab concurrent-streaming and rapid-switch matrix cases that correlate child render, PTY/model, subscription, offer, receipt, and commit checkpoints; verify focused stress tests fail paused children, completion-time catch-up, stale target surfaces, cross-tab interference, and pacing-poll latency.

## 5. Coherent resident presentation

- [ ] 5.1 Reconcile any delivered PR #791 requested/committed presentation work from current `develop`, or stop for explicit consolidation if it remains live; verify the resulting branch has one compositor authority and no parallel eager strip/body implementation.
- [ ] 5.2 Model requested and committed view identity/revision so topology changes commit only with the complete current target surface and modes; verify focused model tests cover create/select, close-successor, reorder/rename, restart/recovery, stale replies, superseded requests, and target removal.
- [ ] 5.3 Compose strip, complete or valid incremental child surface, host overlays, terminal modes, and final cursor into one ordered locked write with synchronized-update bracketing where supported; verify focused renderer tests reject clear-only, strip-only contradictory, stale-body, stale-cursor, blank, and late-superseding frames even when synchronization is ignored.
- [ ] 5.4 Preserve responsive strip-only and child-only damage when it cannot contradict committed state and prioritize a requested target's full-surface subscription; verify focused latency tests meet existing attach/switch budgets during streaming, resize, clock/status churn, notices, and rapid topology changes.

## 6. Integrated parity contract

- [ ] 6.1 Complete the shared matrix for prompt editing, completion/history, effective shortcuts, selection/copy/paste, mouse/focus, dialogs, extension text UI, attachments, resize, streaming, switching, detach, recovery, and restoration; verify each focused direct-versus-resident case either matches or names one declared resident-only difference.
- [ ] 6.2 Update resident architecture and operator documentation with the semantic input boundary, typed effects, requested/committed compositor, concurrency lanes, diagnostics privacy, compatibility fallback, and parity evidence model; verify documentation links and examples match the implemented protocol and supported commands.
- [ ] 6.3 Run only the repository-authorized targeted typecheck, changed test files, native focused tests, and `openspec validate resident-solo-interaction-parity --strict`; verify all complete successfully and that no unrelated product, generated lifecycle, or scratch files enter the change.

## Workflow follow-up

- Trusted finalization synchronizes these deltas and archives the active change after every approved implementation outcome is complete.
- Exact-head CI supplies the required cross-platform development and selected regression evidence after the draft is automatically promoted.
