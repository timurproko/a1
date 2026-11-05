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

A live or uninspectable legacy owner blocks. Even valid metadata naming a dead owner does not exclude another old-version reclaimer: the existing rename-before-nonce-check implementation can move a successor's gate. Malformed legacy metadata supplies no owner proof at all. Age, stable bytes, a missing runtime record, or acquiring only the new OS gate is insufficient to evict a legacy file.

The implemented compatibility fallback retains every existing legacy regular-file gate and returns `worktree-legacy-recovery-required` with a quiescence/restart procedure. All participating processes must use the upgraded protocol; mixed-version mutation/recovery is unsupported. This is a deliberate compatibility limit, not a requirement for manual file deletion after ordinary upgraded-protocol crashes/corruption.

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

The Node-API addon exposes an acquired-state handle because N-API class factories cannot return an optional class instance. The TypeScript adapter maps a non-acquired handle to contention and loads only the owning release's addon (or its explicit development override), never a binary chosen by tool cwd. Missing/old addons fail explicitly. Windows sharing violations remain bounded, classified failures. A damaged durable claim remains unverifiable even if the global mutation gate recovers.

### Implemented coordination decision

The native `SessionLock.tryAcquireGate` holds a descriptor on the persistent claim-store `mutation.authority` file. It reuses the existing Windows LockFileEx / Linux OFD / macOS flock primitives but does not use process-dependent temporary roots. The file is never unlinked. Genuine contention returns null; unavailable/old addons and filesystem failures have separate errors, with no portable PID-file fallback.

A persistent real directory at the legacy `mutation.lock` pathname is the compatibility barrier: legacy exclusive file creation cannot acquire it, and legacy JSON parsing cannot mistake it for an evictable owner. Upgraded operations hold native authority throughout metadata publication, recovery, mutation, and cleanup. The directory is never removed. Fully initialized `owner.next` is synced and renamed to `owner.json`; any abandoned owner/pending metadata is recoverable after acquiring native authority, regardless of its bytes. A single overwritten `recovery.json` records only reason and time. Unknown entries, links, and special files fail closed. Acquisition retries every at most 20 ms for a default 2 seconds and accepts cancellation.

**Legacy exclusion limit:** a legacy PID proven dead still does not exclude a concurrent old-version reclaimer that can rename a successor's sentinel. No portable proof was found for safe in-place migration of an existing legacy regular-file gate. All such files are therefore retained with `worktree-legacy-recovery-required`, including valid/dead-owner files. This chooses the approved conservative compatibility fallback rather than the old unsafe rename-and-restore race. After older processes are stopped and only that exact legacy file is backed up, updated A1 can initialize the barrier. Normal migration from an absent gate requires no file deletion. Older versions cannot mutate claims after this barrier is established; all participating sessions must use the updated release. Neither the barrier nor authority file may be deleted while A1 is running.

## Implementation evidence

- 52 focused TypeScript cases pass across claim-lock, native-adapter, repository-context, runtime-registry, and CLI files. They include corruption recovery, preservation of live claims, legacy refusal, cancellation, linked-path refusal, startup/self-inspection retry, coalescing, disposal, session replacement, sibling agents, and diagnostic privacy.
- Six native session-lock cases pass on Windows, including a real child-process kill followed by gate reacquisition. Native Node-API release build and artifact identity verification pass. An isolated Node child-process smoke also passed live exclusion, process kill, and recovery of the exact 155-NUL-byte metadata shape through the real addon and TypeScript coordinator.
- Managed core build, typecheck, architecture boundaries, session-writer guard, strict OpenSpec validation, and diff whitespace checks pass. No validation budget was increased. An initial shared-dependency build exposed dependency-tree drift; installing this worktree's exact lockfile resolved it without changing dependencies or baselines.
- Runtime registration retries every 30 seconds by default; only one refresh can be queued/in flight. Activation and refresh share the disposal-drained queue; obsolete queued identities are ignored. Only verified self-identity is cached. CLI errors distinguish mutation, runtime, and editing-ownership failures without exposing native error details.

## Known limitations and disposition

- Legacy regular-file gates are intentionally retained, including dead-owner gates; safe one-time recovery requires stopping older processes and backing up only that file. All participating sessions must then use the upgraded release. Accepted as the approved conservative legacy fallback, not advertised as automatic legacy repair.
- Arbitrary corrupted editing-claim records remain unverifiable. Recovery grants no ownership or cleanup authority; this is an intentional safety boundary.
- Linux/macOS native execution and exact-head product validation belong to CI; local native execution covered Windows. No manual validation is claimed or required for implementation completion.

Canonical specs remain untouched until trusted finalization.
