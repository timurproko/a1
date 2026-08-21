## Context

See `proposal.md` for motivation. The measured `0.1.1-dev.3 → 0.1.1-dev.4` update spent 8 seconds in npm and roughly 68 seconds preparing the immutable release: about 36 seconds deriving hashes and copying 13,810 files, then about 32 seconds reading those copied files again for certification. The current path is:

```text
enumerate + read/hash mutable source
                 ↓
          copy every file
                 ↓
    read/hash every destination file
                 ↓
             certify
```

The immutable release and complete verification boundaries protect cohort identity, rollback, and supervisor compatibility and cannot be removed. This change first removes redundant work and captures exact packaged timing. Progress UI is deliberately deferred until the optimized duration is known.

## Goals / Non-Goals

**Goals:**
- Reduce a fresh release from three payload I/O passes to one source read and one candidate write.
- Preserve content-derived release IDs, atomic candidate publication, certification evidence, rollback, and full verification of untrusted existing releases.
- Make operation counts deterministic in unit tests and wall-clock performance measurable on the accepted release runner.
- Preserve concise update output, clean process exit, and a quiet launch after successful activation.

**Non-Goals:**
- Adding a progress bar, spinner, heartbeat, or other update animation in this iteration.
- Trusting the mutable global npm package after update completion.
- Weakening complete verification when a release was not produced by the current uninterrupted process.
- Bundling Pi or changing Node module resolution.
- Adding a persistent blob store or hard-linking cohorts in this iteration.
- Changing npm command syntax, release IDs, on-disk manifests, or supervisor protocol.
- Optimizing CI; `optimize-ci-release-validation` owns that separate concern.

## Decisions

### 1. Derive identity while writing the candidate

Replace `derive identity → copy` with one bounded-concurrency materialization operation. It first discovers the declared distribution and dependency-closure paths, creates a private random candidate directory, and then streams each source file into its candidate destination while calculating SHA-256, byte count, executable metadata, and deterministic operation metrics from the same bytes being written. After every file succeeds, it computes the existing content digest and release ID, writes the existing manifest format, applies immutable modes, and atomically renames the random candidate to the content-addressed release root.

The stream/write completion and digest belong to one operation, so there is no reason to read the destination again merely to prove that the same buffers were written. Write failures, short writes, source mutations, invalid file kinds, or rename failures invalidate and remove the private candidate.

Alternative rejected: increase copy/hash concurrency. The measured delay is dominated by repeated Windows small-file I/O; more concurrency increases Defender and filesystem contention without eliminating work.

Alternative rejected: bundle all dependencies. Pi uses ordinary package resolution, dynamic provider modules, resources, and extensions; bundling would create a larger compatibility project.

### 2. Use a process-local, single-use materialization proof

A fresh materialization returns the release plus an opaque proof branded by a module-private capability and registered in a module-private `WeakSet`. Certification consumes that proof once and binds the certification evidence to the release ID/content digest without a second complete content read. The proof is never serialized and cannot survive process interruption.

If the process restarts, encounters a pre-existing candidate/release, loses the proof, or detects a concurrent winner at atomic rename, it must use the existing complete verifier before approval. Durable cohort state alone cannot manufacture the fresh proof. This preserves the current trust boundary while removing only the redundant same-process read.

Alternative rejected: simply skip certification verification for every `MaterializedRelease` value. TypeScript shapes are forgeable at runtime and would let unrelated callers bypass the integrity boundary.

Alternative rejected: use hard links or a persistent content-addressed blob cache immediately. They complicate shared-file immutability, garbage collection, executable modes, and tamper blast radius. Single-pass materialization addresses the measured dominant duplication first; cache reuse can be reconsidered from post-change evidence.

### 3. Preserve concise output and clean process settlement

The updater keeps the already accepted concise start/final output. Npm normal output remains captured, actionable npm failure diagnostics remain available, and bare launch emits no installation or activation message after a successful update.

A successful update verifies the detached target supervisor, prints success, closes child streams/sockets/listeners, and resolves so Node returns control to the shell. Tests detect any child-process handle, socket, timer, or listener that retains the update process. No progress-specific output or timers are introduced while performance is being evaluated.

### 4. Gate deterministic I/O counts and platform duration separately

Unit tests use an instrumented filesystem to prove a new release performs one source content read/stream and one destination write per payload file, with no destination content read during fresh-proof certification. Fault injection covers every pre/post-rename boundary and proves partial candidates never become trusted.

An exact packaged Windows transition fixture with at least 10,000 files records npm-excluded phase durations, operation counts, process settlement, and endpoint verification. The accepted budget is 30 seconds from npm completion through verified activation. Wall-clock evidence is release-runner-specific; deterministic operation-count failures remain blocking everywhere.

The first accepted preview transition records actual user-visible total duration. Only after that evidence is reviewed will a separate decision determine whether progress UI is still justified.

## Risks / Trade-offs

- **[A write completes but storage later corrupts bytes]** → Preserve full verification after restart and for every unproven existing release; fresh proof covers only one uninterrupted private candidate operation, matching the process trust already used for atomic state writes.
- **[Source changes while being streamed]** → Keep package ownership released, reject metadata/size instability, include every emitted byte in the identity, and remove the candidate on any inconsistency.
- **[High-concurrency streams exhaust handles or hurt Windows performance]** → Use measured bounded concurrency and capture per-phase evidence; do not assume the existing concurrency is optimal.
- **[The updater still appears quiet for longer than expected]** → First enforce the 30-second post-npm budget and measure the real transition; evaluate progress UI as a separate follow-up only if optimized timing remains confusing.
- **[The 30-second budget varies with hosted runner load]** → Pair it with deterministic I/O-pass assertions and preserve timing evidence; adjust the accepted runner budget only from reviewed representative evidence, never to hide extra payload passes.

## Migration Plan

1. Add operation-count instrumentation around the existing implementation to preserve a measurable before state.
2. Add single-pass candidate creation and opaque proof consumption while retaining the old full verifier for all untrusted/pre-existing paths.
3. Run fault injection, transaction recovery, exact packaged update, process-exit, and Windows performance evidence; retain the old materialization implementation behind an internal rollback switch only until one accepted preview transition passes.
4. Remove the fallback after accepted evidence confirms release identity, rollback, performance, and terminal return. Rollback before that point selects the old complete verification path; it never activates an unverified candidate.
5. Review the optimized user-visible duration and create a separate progress-output change only if evidence shows it remains necessary.
