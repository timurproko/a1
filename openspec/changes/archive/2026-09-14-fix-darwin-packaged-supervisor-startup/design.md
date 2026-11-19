## Context

See `proposal.md` for motivation. Run `34022380161` built `0.1.8-dev.254` after the executable-mode correction. `Validate linux-node24` and `Validate win32-node24` passed, proving the repaired tar mode and Linux containment path, while all seven macOS packaged session-resume cases failed before UI launch because bootstrap observed no supervisor endpoint within eight seconds. The supervisor is detached with ignored stdio, bootstrap observes only endpoint polling, and failures before `SupervisorServer.listen()` are therefore discarded. Separately, the native build records Darwin capability as `unsupported`, the Rust guardian has implementations only for Windows and Linux, and the TypeScript launch guardian rejects every platform except those two.

The release workflow must remain fail closed: macOS cannot be removed from the matrix, its failures cannot be converted to skips, and the aggregate cannot accept a skipped publisher for a new candidate.

## Goals / Non-Goals

**Goals:**

- Turn every detached supervisor startup into a correlated bounded success or actionable failure.
- Identify and repair the concrete macOS pre-listen failure without weakening immutable-release or endpoint verification.
- Certify Darwin process identity and process-group containment for packaged interactive launches.
- Make macOS pull-request and release evidence detect regressions before another publication attempt.
- Publish one fresh preview only after every existing platform gate passes on the same bytes.

**Non-Goals:**

- Skipping macOS package smoke, marking Darwin unsupported while reporting the lane successful, or weakening the final publication aggregate.
- Falling back to an uncontained child process on macOS.
- Changing Windows job-object or Linux process-group semantics.
- Introducing shell-based process discovery, broad process-name killing, new npm dependencies, or external services.
- Increasing the Windows warm-start budget or retrying resource-sensitive failures; that blocker remains in `reduce-post-update-cold-start`.

## Decisions

### Correlate supervisor startup with an owned one-shot result

Bootstrap will create an unguessable startup-attempt identity and an A1-owned result location under the protected runtime root, then pass both the attempt and selected release identity to the detached supervisor. The supervisor entry will atomically publish either ready metadata after its endpoint metadata is durable or a bounded sanitized failure before exit. Bootstrap will race the matching result, child exit, and verified endpoint within the existing startup bound, reject malformed/stale/mismatched evidence, and retain enough failure evidence for CI while bounding cleanup and retention.

A file-based one-shot result matches the existing runtime metadata authority and survives detached stdio. Keeping ignored stdio with no outcome is rejected because it produced the `.254` timeout. Holding a pipe open for the supervisor's entire lifetime is rejected because it couples detached cohort lifetime to a transient bootstrap process.

### Diagnose before correcting the macOS pre-listen path

The first implementation step will reproduce the exact packaged macOS launch with correlated startup evidence and record the failing stage and error. The correction will be made at that failing authority—release certification, storage initialization, endpoint setup, or another pre-listen boundary—and guarded by a focused macOS regression. The plan deliberately does not label the timeout as a guardian failure because the guardian is reached only after the supervisor endpoint is ready.

Removing the packaged session-resume test from macOS is rejected: the product and publication contract require a functioning packaged macOS launch, not merely a buildable tarball.

### Implement Darwin containment as a native POSIX process-group provider

The Rust guardian will add a Darwin implementation using the same ownership model as Linux: spawn without shell interpretation, establish a dedicated process group before exec, transfer foreground control only when stdin is a terminal, monitor parent liveness, terminate the owned group with bounded TERM/KILL escalation, and restore prior foreground ownership. Platform-specific process start identity will use a native Darwin process-information API and will also back bounded PID inspection, avoiding `/proc` assumptions and process-name heuristics.

The TypeScript platform inspector will accept Darwin only through this certified native identity path. Build metadata will change Darwin capability from `unsupported` to `supported` only after the native unit/integration suite passes on the supported runner and the packed manifest binds the exact bytes.

Reusing Linux `/proc/<pid>/stat` is rejected because macOS has no `/proc` contract. Treating `kill(pid, 0)` as start identity is rejected because PID reuse would make ownership unsafe.

### Gate the behavior at native, packaged, and workflow levels

Focused native tests will cover process start identity, command quoting, group cleanup, parent loss, signal outcome, and foreground restoration on macOS. Packaged tests will preserve supervisor startup diagnostics and exercise the exact candidate through session creation/resume. Repository governance will require the macOS lane whenever relevant boundaries change and preserve pack-once/publish-verified-bytes semantics.

Acceptance is one first-attempt publication from authoritative `develop` whose macOS, Linux, and Windows lanes, publisher, aggregate, integrity, and `next` tag all agree. An unrelated Windows Node 22 startup-budget failure remains a separate stream and must also be resolved before that attempt.

## Risks / Trade-offs

- **[Risk] Startup result files become spoofable or stale authority.** → Keep them under the protected runtime root, bind unguessable attempt plus release identity, write atomically, validate shape and size, and never treat them as endpoint ownership.
- **[Risk] Sanitized diagnostics hide the actionable cause.** → Preserve stage, stable error code, process outcome, and bounded product-owned message while excluding environment values and user content.
- **[Risk] Darwin process APIs or terminal behavior differ across runner architectures.** → Use supported native APIs, certify the built architecture in the manifest, and run native plus exact-package tests on the authoritative macOS runner.
- **[Risk] Process-group cleanup reaches an unrelated reused identity.** → Bind PID start identity and containment token before activation and signal only the guardian-created group while the guardian owns it.
- **[Risk] Fixing startup exposes a later Darwin containment failure.** → Treat both supervisor readiness and interactive containment as required milestones in the same macOS gate; do not claim acceptance after only the first passes.

## Migration Plan

1. Land the OpenSpec-only change.
2. Add correlated supervisor startup evidence and reproduce run `34022380161`'s macOS pre-listen failure.
3. Correct the evidenced startup defect and add focused failure/success coverage.
4. Implement and certify Darwin native identity and process-group containment.
5. Run required current-head CI and leave the code pull request open for maintainer acceptance and manual merge.
6. After merge and after the separate Windows Node 22 budget correction is integrated, run `npm run develop` once and record all platform, publisher, aggregate, integrity, and registry outcomes.
7. Roll back the implementation commit if supervision or containment regresses before publication; no registry migration is needed because `.254` was never published.
