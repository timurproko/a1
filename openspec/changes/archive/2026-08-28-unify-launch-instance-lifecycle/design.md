## Context

See `proposal.md` for motivation. Both bare `a1` and prerelease `a1 pi` now use the shared owned rendering pipeline, but launch-instance ownership still has to remain independent for concurrent commands. The supervisor stores plural lifecycle state, and process identity and containment must remain independently verifiable so one command cannot terminate another or leave descendants after root exit.

The immutable bootstrap starts `a1-ui` as a foreground child with inherited stdio and waits for its result. The detached supervisor remains necessary for immutable-release and update coordination, but it must not act as a global interactive-terminal mutex. The lifecycle layer preserves the shared owned runtime and must not become a PTY, terminal relay, parser, renderer, or signal translation path.

## Goals / Non-Goals

**Goals:**

- Put every interactive command behind one profile-neutral ownership boundary before runtime selection.
- Support multiple simultaneous instances of all profiles while retaining one global release supervisor.
- Guarantee terminate-tree-on-close for the root runtime and descendants, including abnormal guardian death where the platform can provide kernel containment.
- Make one instance's normal exit, crash, owner disconnect, update stop, or reconciliation independent from every other instance.
- Keep the shared owned runtime in authority over stdin, stdout, stderr, terminal modes, resize, and ordinary signals.
- Make ownership evidence plural, authenticated, boot-scoped, process-identity checked, and safe under PID reuse.
- Preserve concise user diagnostics and automatic cleanup without requiring PID or database operations.

**Non-Goals:**

- Persisting agents or terminal processes after their originating command closes.
- Adding an implicit detach, resident workspace, reconnection, or background-agent mode.
- Changing the shared owned rendering pipeline selected by either interactive profile.
- Interpreting terminal traffic in the guardian or supervisor.
- Resuming the held multi-agent/composed-terminal implementation.
- Forcing the idle control supervisor to exit when the last interactive instance closes.

## Decisions

### 1. Replace the global foreground lease with a launch-instance aggregate

The lifecycle domain will use `LaunchInstance` as the aggregate root. Each aggregate contains a unique instance ID, authenticated owner client ID, profile ID, release and supervisor-boot identity, state, guardian/root native identities, containment identity, timestamps, shutdown policy, and one terminal outcome.

The state machine is:

```text
requested -> active -> stopping -> completed
     |          |          |
     +----------+----------+-> interrupted
```

Terminal states are immutable. Commands are idempotent by request ID and instance ID. A supervisor keeps a map of active instances rather than a singular field, and endpoint metadata publishes arrays derived from that map. There is no global `busy` launch state.

Keeping a global lease and adding stale-row takeover was rejected because it would still prohibit valid independent terminals and would leave bare `a1` outside the same lifecycle.

### 2. Add one profile-neutral launch guardian above runtime selection

The immutable bootstrap will start a launch guardian instead of starting `a1-ui` directly. The guardian then starts the immutable `a1-ui` entry with the selected profile environment inside a containment scope and waits for it. `a1-ui` continues to choose product or Pi-comparison configuration inside the shared owned runtime.

```text
mutable a1 command
  -> immutable bootstrap
    -> Node launch guardian (authenticated instance coordinator)
      -> native process guardian (containment owner; lifecycle-only side channel)
        -> a1-ui (profile selector; inherited terminal handles)
          -> owned product UI or owned Pi-comparison UI
            -> extensions, tools, agents, daemons, descendants
```

The Node guardian owns the supervisor connection, instance protocol, close ordering, and final outcome. The approved native boundary is a standalone Rust `a1-process-guardian` executable rather than a Node-API addon. It owns the platform containment handle, launches `a1-ui`, monitors both its Node parent and runtime child, and exchanges only bounded lifecycle/identity messages with the Node guardian over a private local side channel. Neither guardian reads ordinary stdin, inspects stdout/stderr, reserves terminal rows, creates a PTY, parses bytes, renders, or synthesizes responses. Runtime terminal handles remain inherited directly. The guardians ignore ordinary foreground interrupt delivery where necessary so the selected runtime remains the terminal interaction owner; they react only to declared lifecycle shutdown conditions.

Putting separate lifecycle wrappers inside each profile composition was rejected because it duplicates failure handling and cannot reliably clean descendants after the runtime wrapper itself crashes. Having the detached supervisor own terminal rendering was rejected because it would violate the shared UI runtime's authority.

### 3. Use a platform containment adapter with kill-on-owner-close semantics

The guardian will depend on a narrow `ProcessContainment` boundary that can create a containment scope, spawn the root inside it with inherited handles, expose a verifiable containment identity, request graceful stop, force stop once, wait within deadlines, and close its ownership handle.

On Windows, the supported adapter uses the standalone Rust process guardian to create a Job Object configured with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` and without breakaway permission. The helper holds the job handle; `a1-ui` and every descendant join the job. The helper monitors the Node guardian's verified process handle, so Node guardian death closes the Job Object even when the helper itself remains scheduled. Normal root exit, lifecycle stop, parent death, and helper failure all converge on bounded Job Object closure. The helper is built independently from the held terminal host and packaged under `dist/native/<platform>-<arch>/a1-process-guardian[.exe]` with an integrity manifest.

Unix adapters must preserve the invoking controlling terminal and foreground behavior while using the strongest certifiable native ownership available, such as a dedicated command process group plus parent-death/subreaper or equivalent process-observation support. They must not blindly signal a process group that can include the parent shell. A platform that cannot prove containment and close isolation remains uncertified/unsupported for this guarantee rather than silently claiming process-tree cleanup.

Using only `ChildProcess.kill()` was rejected because it does not own grandchildren. Using `taskkill` as the primary Windows boundary was rejected because it cannot provide kill-on-guardian-crash semantics and creates a PID-reuse race. Platform tree-kill commands may be used only as a bounded verified fallback after native identity comparison.

### 4. Make the Node guardian the authenticated protocol owner

The Node guardian's control-handshake client ID becomes authoritative for the instance. Creation records that client ID; later activate, stop, and complete operations must arrive over the same authenticated connection and name the same instance. The protocol rejects caller-supplied owner identity that does not match the handshake. The Rust helper never connects to the supervisor and therefore cannot become a second ownership authority.

The Node guardian creates the instance before spawning the helper, activates it after the helper reports verified runtime and containment identities, and completes it only after the helper reports the root outcome and confirms containment closure. Socket closure before completion triggers per-instance reconciliation. Closing an unrelated socket has no effect. The private Node/helper side channel carries only bounded ready, stop, outcome, and error messages and is never used for terminal input or output.

An arbitrary owner string disconnected from the authenticated socket was rejected because the supervisor could not determine which lease to reconcile safely.

### 5. Use symmetric failure handling

Lifecycle responsibility is deliberately redundant across the local guardian, kernel containment, and supervisor observation:

- Root exits: guardian closes containment, waits for descendants to disappear, records the root result plus cleanup result, and completes the instance.
- Guardian exits or terminal closure kills it: kernel containment closes; supervisor observes owner socket loss and records interruption after verifying containment/root death.
- Supervisor disconnects: guardian treats control ownership loss as an owner-disconnect stop request, closes its local containment, and exits; the next supervisor boot reconciles prior-boot records.
- Update requests stop: supervisor sends a typed stop intent to every affected guardian; each guardian closes locally and reports its own outcome.
- Supervisor observes uncertain identity: it records diagnostics and does not kill the uncertain process. Because instances are not globally exclusive, uncertainty does not block unrelated new launches, although it can block cohort replacement.

Relying only on the supervisor was rejected because supervisor failure would leave runtime trees unmanaged. Relying only on the guardian was rejected because abrupt owner loss would leave no durable outcome or update authority.

### 6. Store plural launch instances in a new schema

The control store will add a `launch_instances` table rather than reinterpret `foreground_terminal_leases`. The new table records identity and bounded lifecycle metadata only; it does not store environment secrets, terminal bytes, or display state. Indexes enforce unique instance IDs and valid owner/boot lookup, not one live row.

The migration will:

1. preserve released foreground-lease history;
2. mark any old requested/active lease as interrupted with a legacy-migration outcome;
3. create the plural launch-instance schema and indexes;
4. stop loading old lease rows as current ownership; and
5. publish no live ownership until instances authenticate against the current supervisor boot.

Trying to convert an old live lease into a live instance was rejected because its guardian and containment identity do not exist and persisted data alone cannot prove liveness.

### 7. Keep process identity OS-verifiable

A native process identity will contain a PID and a platform start token that an independent process inspector can re-read. Random broker-local UUIDs may identify protocol generations but cannot serve as the native start token used for cleanup. Containment identity is checked in addition to root process identity.

Cleanup checks identity before graceful stop and again before forced escalation. A mismatch yields a safe ownership failure. This reduces PID-reuse risk and ensures one instance cannot target another instance that happens to reuse a numeric PID.

PID-only cleanup was rejected as unsafe. Persisted identity without current platform verification was rejected as insufficient liveness proof.

### 8. Fan update coordination out across active instances

The supervisor's ownership metadata and update transaction will enumerate every verified active instance in the release cohort. Update shutdown sends one typed stop request per instance, waits within one overall bounded policy, and requires every instance to reach a verified terminal outcome before the cohort is considered idle. Failure or uncertainty in one instance prevents replacement but does not falsely release or terminate another.

Sequentially reusing the existing singular release operation was rejected because the first completion could incorrectly publish the entire cohort as idle and because it cannot represent concurrent shutdown progress.

### 9. Preserve future capability separation

Default instances are non-detachable. Durable records may preserve names, settings, or prior outcomes, but they do not imply a live process survives command closure. If a future workspace needs resident agents, it must introduce an explicit capability with separate ownership, user controls, update semantics, and recovery guarantees.

Before the held `evolve-bare-a1-into-multi-agent-workspace` change resumes, its planning artifacts must be revised so structured agents and any future composed host are children of the originating bare-`a1` instance by default. Reconnection may restore durable state into a new process, but it may not silently reconnect to a process that survived a closed default instance.

Allowing the held plan's default live-process reconnection semantics to coexist was rejected because it contradicts the approved terminate-on-close contract.

## Risks / Trade-offs

- **[Native containment adds platform packaging and provenance work]** → Keep the boundary minimal, integrity-verify packaged artifacts, isolate it from terminal behavior, and certify exact packages per platform.
- **[Windows Job Object assignment can interact with an outer host job]** → Detect assignment capability before runtime startup, test nested-job behavior on supported Windows versions, and fail concisely rather than falling back to an uncontained claim.
- **[Unix terminals and process groups differ across shells and emulators]** → Preserve inherited controlling-terminal state, prohibit unsafe group signaling, and gate support on platform-specific exact-artifact tests.
- **[Supervisor failure will close active sessions under the chosen non-detachable policy]** → Keep the supervisor small and stable, record interruption, and prefer safe closure over unowned surviving runtimes.
- **[A process may attempt native breakaway or daemonization]** → Deny breakaway where the platform supports it; otherwise detect loss of containment and mark the platform/instance degraded rather than promising cleanup.
- **[Plural update shutdown increases race and timeout complexity]** → Use immutable per-instance outcomes, idempotent stop requests, an aggregate deadline, and tests with mixed normal, delayed, and failed instances.
- **[Migration discards apparent old liveness]** → Preserve historical evidence but never trust rows that lack current guardian and containment authentication.
- **[An idle supervisor remains visible after all commands close]** → Document it as control infrastructure and ensure metadata proves that no instance-owned runtime remains.

## Migration Plan

1. Create a detached implementation worktree from current `origin/develop` and introduce dependency-free plural launch-instance domain/protocol contracts alongside the old lease contract.
2. Add the control-store schema migration and plural supervisor model; migrate old live leases to historical interrupted outcomes while keeping launch behavior on the old path until cutover.
3. Implement the profile-neutral guardian and an injectable containment boundary, then implement and package the Windows Job Object adapter before claiming Windows close guarantees.
4. Route both interactive profiles through the guardian while preserving the shared owned rendering pipeline beneath it.
5. Remove singular lease acquisition, uniqueness, metadata, and cleanup paths after all profile routes use launch instances.
6. Convert self-update and cohort ownership checks to plural instance fan-out.
7. Add hermetic contract/integration fixtures plus exact-artifact platform checks; let CI provide required automated validation and obtain user-controlled close/process-tree acceptance before publication.
8. Update documentation and reconcile the held multi-agent planning artifacts without lifting their hold.
9. After acceptance, archive the change and integrate it according to the repository workflow.

Rollback retains the previous immutable release and database history. If cutover fails before publication, disable the new guardian route and restore the old release as a whole; do not mix old singular lease clients with the new plural protocol. After schema migration, rollback tooling may read launch-instance history but SHALL publish no unverified rows as live ownership.
