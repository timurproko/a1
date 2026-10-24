## Context

The report concerns severe, repeating UI stalls after machine sleep/wake, including menu scrolling, streamed agent presentation, previously running instances, and fresh launches. This is broader than a provider response-time problem: local menu interaction needs no model network request. A stale timer in one existing JavaScript process is also insufficient by itself to explain fresh processes.

The investigation used read-only source inspection and bounded, disposable Windows timing probes. No running user tab was stopped, no machine suspend was initiated, and no product code was changed. The primary checkout contains unrelated work and was left untouched. The investigation owns `.worktrees/wake-ui-stalls` on `fix/wake-ui-stalls`.

### Confirmed source facts

1. On Windows, `endpoint::EndpointStream` is a synchronous `std::fs::File`. Both `CreateNamedPipeW` and client open omit `FILE_FLAG_OVERLAPPED`; cloned streams refer to the same pipe object.
2. `roles/wire.rs::wait_for_pipe_data` calls `PeekNamedPipe` and sleeps 1 ms for the first second of a read, then 8 ms until data appears. Every `wire::read_payload` enters this path, not just startup. The comment explains the workaround: blocking reads on the synchronous duplex handle can stall its writes.
3. Interactive input traverses attach -> server -> holder -> ConPTY child. Child output returns as holder -> server -> attach -> outer terminal. Polling delays at distinct pipe readers can therefore accumulate in both directions. They are not isolated to a menu component or a provider.
4. `node_addon.rs::run_role` makes one unchecked `timeBeginPeriod(1)` request before dispatching a native role. Effective short-sleep behavior is thus an ambient Windows scheduling assumption; the transport does not establish a completion-based readiness guarantee. The call alone does not establish what happens across wake or under Windows power/visibility policies.
5. `roles/attach.rs::Client::tick` detects a wall-clock gap of at least `OUTER_RESUME_GAP` and forces one complete repaint. This repairs a possibly stale outer screen, not ongoing pipe readiness latency. The attach and holder loops already have coalesced event wakes for incoming work; replacing those with tighter polling is not warranted.
6. `endpoint.rs::set_handshake_deadline` currently polls for the first available byte. It does not bound a peer that sends a header or body only partially. A new endpoint abstraction must carry the existing four-second handshake budget through the complete handshake, not reproduce that first-byte-only limitation.

### Measurements on the investigation workstation

Windows 11 x64, build 26300. These are small standalone scheduling/pipe probes, **not production A1 frame measurements** and **not before/after physical suspend evidence**. Probe sources are ignored under this worktree's `.artifacts/agent/`; only the non-sensitive result summary is durable.

| Standalone probe | Samples | p50 | p95 |
| --- | ---: | ---: | ---: |
| `Thread.Sleep(1)`, no process-local timer request | 128 | 15.461 ms | 16.100 ms |
| `Thread.Sleep(8)`, no process-local timer request | 64 | 15.450 ms | 16.212 ms |
| `Thread.Sleep(1)`, successful `timeBeginPeriod(1)` | 128 | 1.525 ms | 2.168 ms |
| `Thread.Sleep(8)`, successful `timeBeginPeriod(1)` | 64 | 8.553 ms | 8.747 ms |
| One pipe echo round trip, `PeekNamedPipe` + 1 ms sleep readiness, no timer request | 64 | 16.638 ms | 31.642 ms |
| One pipe echo round trip, asynchronous completion readiness, no timer request | 64 | 0.020 ms | 0.054 ms |
| One pipe echo round trip, polling readiness, successful timer request | 64 | 1.582 ms | 3.171 ms |
| One pipe echo round trip, asynchronous completion readiness, successful timer request | 64 | 0.021 ms | 0.044 ms |

The echo probe used asynchronous .NET pipe handles in both variants and added the existing readiness algorithm only in the polling variant; it isolates polling cost, not the native endpoint implementation. Samples include startup effects; no production latency budget is inferred from the completion numbers. Each successful timer request was balanced in `finally` with `timeEndPeriod(1)`.

`NtQueryTimerResolution` reported a current system resolution of 1 ms even while the unrequesting process slept about 15.5 ms. A system-wide timer query therefore cannot certify an individual role's effective sleep latency. Read-only power-throttling queries for the observed native roles returned control/state masks of zero; this does **not** prove an ignored timer request or a wake-induced policy transition. The default-profile host status showed no attached client, so its healthy liveness counters cannot be attributed to the reported interactive stall. A short process sample showed another program consuming roughly one core, but that is not evidence that A1's transport or the whole machine is saturated.

### Diagnosis and confidence

**Confirmed:** the Windows transport is timer-sensitive, and the readiness algorithm alone can add approximately 16-32 ms per echo round trip under coarse process-local sleeps. Multiple such waits can plausibly produce recurring, shared input/presentation latency rather than one stale frame.

**Leading hypothesis, not proven:** after wake, changed Windows scheduling/timer policy or a degraded shared resident path exposes this dependency. New invocations can reuse an existing profile's server/holders, and independent roles also share the same scheduling-sensitive algorithm. Neither explanation requires a new child to inherit an old JavaScript timer.

**Open:** no affected A1 session's wake transition was instrumented. Outer Windows Terminal/ConPTY delays, a blocked native writer, shared-server contention, child event-loop stalls, and machine scheduling pressure remain alternatives. If direct `a1 solo` also stalls with low child-to-outer write latency, the resident transport is not a complete explanation. Do not call the physical wake problem resolved solely from the standalone numbers or this proposal.

## Goals / Non-Goals

**Goals:**

- Remove timer-resolution-dependent readiness waits from Windows resident transport.
- Let reads and writes progress independently while preserving ordered bounded frame delivery.
- Keep admission, partial handshakes, disconnect, and cancellation bounded and leak-free.
- Preserve existing tab identities, sessions, controller barriers, coherent surfaces, and one-shot wake repaint.
- Make an affected wake episode diagnosable with bounded, opt-in, content-free timing observations.

**Non-Goals:**

- Changing model/provider streaming, Pi's render cadence, hidden-tab rendering policy, or global UI frame budgets.
- Global timer changes, higher process priority, disabling Windows power saving, busy spinning, or automatic terminal/GPU resets.
- Restarting the resident server, holders, children, or user's terminal on wake.
- Claiming support for arbitrary outer-terminal/driver failures without evidence.
- Automatic physical suspend tests on an active workstation.

## Decisions

### 1. Use a Windows endpoint abstraction with overlapped completion

Replace the Windows `File` alias with an owning endpoint type whose server and client handles are created for overlapped I/O. Implement the `Read`/`Write` surface used by the native frame layer through actual overlapped operations and completion events, not by passing an overlapped handle to ordinary `File::read`/`write`. Handle both immediate completion and `ERROR_IO_PENDING`.

Read and write operations use separate operation state/events and retain the handle and buffers until the kernel has completed them. Clones preserve the existing one-reader/one-writer architecture without serializing a pending read against its writer. Connection acceptance must likewise use a correct overlapped `ConnectNamedPipe`, including the already-connected race. Waiting for a busy endpoint uses a bounded OS availability wait rather than an interactive sleep loop.

After this abstraction lands, `wire::read_payload` uses its ordinary bounded frame decoder on all platforms without Windows `PeekNamedPipe` readiness polling. Unix sockets retain their existing implementation. The frame bytes, generation, and security contracts do not change.

### 2. Treat deadlines and cancellation as operation ownership

Carry an absolute four-second handshake deadline through the complete first envelope, including a fragmented length prefix and body, and clear it only after admission. Cancellation is operation-scoped: cancel and drain the pending operation before releasing its event, buffer, or final handle reference. A read timeout must not cancel an independent write on a shared connection.

Define shutdown ownership at every reader/writer split so a waiting operation wakes when its peer disconnects or its owning connection closes. Prevent pending-read threads or kernel operations from accumulating across reconnects and repeated wake-gap simulations. Preserve owner DACLs, remote-client rejection, first-instance protection, peer identity verification, non-inheritance, and all existing size/queue bounds.

### 3. Keep transport correctness independent of multimedia timers

Do not fix the report by merely reissuing `timeBeginPeriod(1)` after a wall-clock gap. That would preserve the polling dependency, would not prove the effective period, and would maintain high wake-up rates in detached roles. The transport must function without that call or with it denied/ineffective. Whether the existing request can be removed for other native timers is decided from focused measurements during implementation; no unrelated timer/cadence rewrite is included.

Keep the current one-shot cached-frame repaint after a detected attach gap. A wake gap is an observation, not proof of a device failure, a child hang, or authority to restart anything.

### 4. Extend existing opt-in progress observations, not synchronous hot-path logs

Use `roles/progress_observation.rs`'s bounded asynchronous queue. Add local monotonic duration metadata for pipe read/write completion and outer write completion, plus an explicit wake-gap/repaint stage, allowing existing holder/attach stage observations to distinguish transport delivery from outer output. Normal waiting for the next frame is idle time, not by itself a latency fault: record transfer/completion durations and correlate only causally matched input tokens or surface revisions in fixtures. Never treat the entire pending-read lifetime as a slow-frame metric.

Keep wall time only for approximate cross-process correlation; local durations must use a monotonic clock. A detected gap or wall-clock discontinuity separates measurement epochs, and invalid/negative cross-epoch derived latencies cannot enter percentile evidence. Add only bounded scalar metadata and fixed stage identifiers, never frame bytes, key text, prompts, transcripts, credentials, or environment values. Diagnostic backpressure drops observations and reports loss, never delays product I/O. Existing observer consumers remain compatible with additive optional fields.

### 5. Use discriminating regression cases rather than a repaint-only check

Focused native cases cover data arriving after ordinary idle, immediate and delayed completions, split headers/bodies, real duplex progress while a read is pending, disconnect/cancel races, bounded handshake expiry, reconnect ownership, and slow-peer isolation. A Windows subprocess with no multimedia timer request proves that the new readiness path does not need short sleeps. A deterministic wait backend/call seam makes accidental sleep-polling or use-after-cancel regressions fail without fragile microsecond assertions.

Drive a simulated long attach wall-clock gap with a monotonic test clock and verify exactly one full repaint, preserved control/ordering, and subsequent ordinary progress. Exercise both an existing connection and a new connection after the gap. This is wake-gap/state-machine coverage, not physical suspend certification.

After approval, compare causally matched native input-to-child and holder-commit-to-outer-write distributions under normal and coarse-timer conditions. Preserve the declared existing budgets; do not replace them with standalone .NET results or relax them to make the fix pass. CI owns required product validation after implementation readiness.

## Risks / Trade-offs

- Overlapped I/O adds lifetime complexity: separate operation ownership, explicit cancellation draining, and partial-transfer tests are mandatory.
- A synchronous compatibility adapter can accidentally serialize duplex progress: pending-read/concurrent-write tests must use the real endpoint.
- A quiet read can appear slow despite correct behavior: distinguish idle waiting from matched-event delivery latency.
- Heavy observation can create its own stalls: keep it opt-in, bounded, asynchronous, and lossy only for diagnostics.
- A Windows Terminal/ConPTY issue may remain after transport hardening: use the differential diagnosis below and report unresolved physical evidence honestly, without broadening implementation silently.

## Validation and rollout

Implementation remains blocked on explicit plan approval and an implementation request. Then use focused native endpoint/wire/role tests, touched observation-consumer tests, `npm run typecheck`, and strict validation of this change before pushing. Do not run directory-wide/full regression locally absent a CI failure or explicit request.

Optional maintainer physical investigation, never a checkbox/finalization gate:

1. Compare menu navigation and streaming in a resident A1 instance and direct `a1 solo` in the same outer terminal before wake.
2. Let the maintainer put the machine to sleep normally; do not automate workstation suspend.
3. Compare the existing resident client, a new client on that same profile/server, a fresh profile/server if desired, and direct solo after wake. Note which paths stall and whether another terminal application also stalls.
4. Use the opt-in stage observations to distinguish delayed input admission, child rendering, holder commit, pipe completion, and outer write. Outer write completion is not proof of physical pixel presentation.
5. Repeat after transport hardening. If only resident paths recover, the proposed transport mechanism is supported. If solo and other terminal programs remain affected, investigate the outer-terminal/OS path as a separately evidenced refinement rather than declaring this fix sufficient.

## Migration and rollback

No stored-session, registry, or generation migration. Old and new roles exchange the same bounded bytes, so mixed-release cohorts remain compatible. Existing resident cohorts are retained by update policy; installing the fix does not hot-patch their pipe handles and must not kill them. Full deployment to those roles waits for their ordinary lifecycle or an explicit maintainer-chosen stop, which is never an automatic recovery action. Rollback restores the previous endpoint implementation without changing or replaying user sessions. Keep any physical sleep/wake conclusion explicitly pending until observed.
