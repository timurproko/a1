## Context

The supplied incident reports describe an invalid 155-byte all-NUL mutation lock and both `worktree-claim-busy` and `session-runtime-unavailable`. They report that removing that one lock restored operation. The original corruption cause is unknown; no surviving lock bytes were independently inspected in this task.

Source inspection confirms:

- `withClaimLock` creates the public lock with `open(..., "wx")`, then writes JSON. Interruption can leave an empty or incomplete public record. Other corruption sources remain possible.
- `evictDeadLockHolder` cannot recover malformed records or records without start identity; every later acquisition repeats the same bounded busy failure. Dead-holder eviction is attempted only on the first loop iteration.
- Eviction renames before comparing the moved nonce, and release unconditionally removes the shared pathname. Replacement races require explicit coverage; recovery must never move/delete a successor's authority.
- `SessionRuntimeRegistry.readerFor` arms its timer only after successful activation. A first activation failure skips retries. A failed owner inspection is cached as null indefinitely.
- Existing Rust `SessionLock::acquire_location` already supplies platform-held location exclusion, but the Node-API wrapper currently exposes only session-writer acquisition. The session-writer portable fallback is another PID/JSON sentinel and is not a solution to this failure mode.

## Goals / Non-Goals

**Goals:** End indefinite poisoning by malformed mutation metadata in the recovery-capable protocol; recover after a crashed mutation owner; retry runtime publication without restarting; preserve exclusive editing claims; classify failures with bounded, actionable diagnostics.

**Non-goals:** Automatically steal live/unverifiable worktree claims; reset sessions or claim directories; unlock Git worktrees; alter cleanup or delivery rules; repair arbitrary corrupted durable claim records; modify Pi upstream behavior; add a global recovery daemon or an unrestricted force-unlock command.

## Decisions

### 1. Make exclusion independent of lock metadata

Use an OS-held lock keyed to the canonical claim-store location for the entire mutation and recovery critical section. Reuse the terminal-host native location-lock primitive through a narrowly scoped adapter. The kernel releases authority when the holder exits; JSON is diagnostic/compatibility state, not the sole evidence of a live upgraded holder. Missing/unusable native support must have an explicit conservative outcome, not silently fall back to the same poisonable sentinel.

Keep native authority at a stable location identity, not the inode of a file that recovery replaces. Publish any metadata through fully initialized private files and atomic publication; retain ownership/generation checks for removal and replacement. Separate real contention from permission, path-boundary, native-loader, and I/O failures. Waits remain bounded and abortable; no busy-spin or unbounded queue.

Metadata recovery must happen only while holding authoritative exclusion and after compatibility checks. Preserve a bounded, private recovery record without transcript content or credentials. Quarantine only the exact proven-recoverable artifact; never clear the runtime/claim directories or worktree state.

### 2. Treat legacy compatibility as a safety boundary

An OS lock held by upgraded code does not exclude an old process that never takes it. Retain interoperation with the legacy `mutation.lock` gate while such writers can exist; do not merely switch to a new filename and allow parallel writers.

Valid legacy metadata keeps exact PID/start-identity checks: a live or uninspectable owner blocks, while a proven-dead owner is recoverable with replacement-race protection. Malformed legacy metadata supplies no owner proof. Age, stable bytes, a missing runtime record, or acquiring only the new OS gate is insufficient to evict it.

Before implementing migration, establish and document the supported platform mechanism for proving legacy-writer exclusion. Automatically migrate a corrupt legacy artifact only when that exclusion can be established. Otherwise return a specific legacy-recovery-required diagnostic with a safe quiescence/restart path; never claim that ambiguous old state was automatically repaired. This is a deliberate compatibility limit, not permission to require manual file deletion for ordinary upgraded-protocol crashes/corruption.

### 3. Keep runtime registration recoverable

Remember the current agent/session identity and arm lifecycle-owned retries independently of the first activation result. Retry transient owner-inspection failures rather than permanently caching null; cache only verified identity. Serialize and coalesce retries so slow attempts cannot accumulate an unbounded promise chain.

A retry publishes only the current agent/session generation. It must not revive a replaced session identity, adopt another runtime, steal a worktree, or erase sibling claims. Disposal cancels future work and waits for in-flight publication before releasing claims; no late publication after disposal. Recovery of registration enables a subsequent explicit link in the same running session. Persisted-context reactivation, if retried, retains the normal claim checks and startup-context fallback.

### 4. Make unresolved failures actionable

Keep genuine live worktree ownership conflicts distinct from mutation-gate contention. Expose stable reasons for transient busy, damaged legacy state requiring safe recovery, unavailable process inspection/native coordination, and unrecoverable I/O failures. Explain whether a bounded automatic retry is occurring or safe operator action is required, without revealing another session's identity or content. Inventory remains read-only and does not silently perform repair.

## Regression coverage

- Empty, truncated JSON, 155 NUL bytes, malformed/oversized metadata; fresh in-progress publication versus abandoned upgraded metadata.
- Owner killed before publication, after gate acquisition, during mutation, and before cleanup; acquisition succeeds after kernel release.
- Two simultaneous recoverers/linkers, delayed former holder cleanup, and a replacement generation; at most one mutation owner and one successful claim.
- Live holder, uninspectable holder, reused PID, valid legacy dead holder, and ambiguous corrupt legacy holder; no age-based takeover.
- Initial activation fails then succeeds; first process inspection fails then recovers; repeated failures remain bounded; session switch and disposal during retry; sibling agents remain independent.
- CLI reason/next-step output and absence of sensitive identities; inventory performs no recovery writes.
- Real cross-process native exclusion/crash release on supported platforms, including Windows, not only mocked filesystem fixtures.

## Risks / Rollout

Native ABI/packaging availability and mixed-version coordination must be resolved before the first implementation outcome is checked. Do not reuse session-writer fallback semantics as recovery proof. Windows sharing violations remain bounded, classified failures. A damaged durable claim remains unverifiable even if the global mutation gate recovers.

Planning has no implementation or runtime validation evidence. Implementation must record the chosen legacy exclusion mechanism, concrete retry bounds, diagnostics, targeted test results, and any residual compatibility limitation here before final readiness. Canonical specs remain untouched until trusted finalization.
