## 1. Recover history safely

- [x] 1.1 Introduce explicit history service recovery states and generation/attempt accounting; verify deterministic tests cover same-instance recovery after busy responses and delayed acknowledgements without a permanent failure latch.
- [x] 1.2 Carry transaction certainty from storage through worker responses and retry only confirmed-uncommitted candidates with their original submission identity/order; verify rollback, lost acknowledgement, concurrent repeated text, and late-generation response cases cannot duplicate commits or advance recency incorrectly.
- [x] 1.3 Implement capped asynchronous backoff, 30-second pending-candidate retention, the hard worker-liveness guard, one active worker/request, and coalesced refresh; verify fake-clock/resource tests enforce the design's count, byte, timer, and deadline limits and resume future writes after recovery.
- [x] 1.4 Reopen only after confirmed worker termination, preserve bounded local recall, and keep corrupt/profile-mismatched/newer-schema stores intact; verify worker-loss and blocked-storage fixtures do not replay uncertain writes, overwrite files, or change profile isolation.
- [x] 1.5 Cancel recovery correctly during disposal and preserve the two-second close deadline; verify all admitted promises settle, no worker/poll restarts after close, and stale snapshots cannot overwrite a draft or active browse cycle.

## 2. Make background history diagnostics developer-only

- [x] 2.1 Route classified history outcomes to bounded explicit developer diagnostics instead of controller notifications or shell post-stop output; verify busy, unavailable, capacity, blocked-storage, recovery, and shutdown cases produce zero normal user-output messages while commit results remain truthful.
- [x] 2.2 Preserve diagnostic privacy and ordinary unrelated errors; verify opt-in evidence contains no prompt text, SQL values, or arbitrary exception payloads and genuine provider/user-command failures still follow their established presentation.

## 3. Replace arbitrary event eviction

- [x] 3.1 Extract and classify pending engine delivery using actual listener semantics; verify a table-driven test covers every event kind and distinguishes replaceable complete state from protected side-effect-bearing transitions.
- [x] 3.2 Implement constant-time keyed supersession by entity, generation, and ordering segment with protected barriers; verify multi-block interleaving, monotonic delivered sequences, final/error transitions, command outcomes, run/message completion, and session replacement against an uncoalesced reference trace.
- [x] 3.3 Bound pending nodes and retained payload without duplicate accumulated snapshots or full-transcript work per chunk; verify the declared 16,384-update/32-block ordinary burst preserves final content within the 1,024-node and 8-MiB queue budgets without exceptional recovery.
- [x] 3.4 Preserve cooperative transcript delivery and final-state flush behavior; verify input/pointer/timer turns, reentrant listeners, completion preemption, and `flushEvents()` completion/failure semantics with no stale partial applied after a final state.
- [x] 3.5 Implement the reserved bounded overload recovery path and admission control for protected-only saturation; verify a critical-event flood cannot silently drop accepted controls, hang command/flush promises, fabricate success, allocate an unbounded emergency queue, or reuse stale generation state.
- [x] 3.6 Separate pressure counters and recovery telemetry from visible adapter diagnostics/status; verify no current or renamed coalescing/backpressure messages appear in normal UI or terminal channels while explicit developer evidence records real supersession and exceptional overload separately.

## 4. Integrated resilience acceptance

- [x] 4.1 Add real independent-process SQLite contention/recovery coverage on Windows and POSIX; verify a lock held beyond the former short timeout is released and admitted known-uncommitted prompts persist without restarting the live UI instance.
- [x] 4.2 Add the combined shell fixture with a three-second history lock, high-rate assistant/tool output, browsing, typing, and cancellation; verify final transcript/control state, recovered persistence, input responsiveness, bounded resources, and zero technical warning/recovery output, with internal evidence proving both pressures occurred.
- [ ] 4.3 Run existing selected rendering/input and editor-history regression gates in CI without relaxing budgets; verify pinned `a1 pi` behavior and unrelated provider/command error presentation are unchanged.

## 5. Delivery and manual acceptance

- [ ] 5.1 Deliver the implementation PR with required CI results and an exact built-worktree manual handoff for concurrent same-profile instances and high-output streaming; verify the handoff demonstrates both automatic recovery and the absence of warnings rather than only matching strings.
- [ ] 5.2 Record maintainer acceptance of quiet recovery, saved recall, final content, and responsive input; verify explicit acceptance and merge authorization exist before integrating code and archiving this change.
