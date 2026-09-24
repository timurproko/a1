## Purpose

Defines the explicit resident capability that keeps bare-A1 agents alive independently of any terminal: the per-profile agent host, per-agent workers, their protocols, durable registry, ownership and authentication, crash, reboot, and update recovery, limits, diagnostics, and platform detachment.

## ADDED Requirements

### Requirement: One resident agent host serves each user profile
A1 SHALL run at most one resident agent host per operating-system user and canonical A1 profile root. The host endpoint SHALL be derived from the canonical profile home and runtime directory, SHALL be independent of the release cohort, and SHALL honor hermetic directory and endpoint overrides. Binding the endpoint SHALL be the single-instance lock: a starting host that finds a live verified host SHALL exit as already running, and a caller SHALL join the winner. A stale endpoint SHALL be reclaimed only after a failed live handshake. A host SHALL remove its endpoint on exit only when its ownership marker still identifies itself.

#### Scenario: Two launches race to start the host
- **WHEN** two bare `a1` invocations of the same profile start concurrently with no host running
- **THEN** exactly one host SHALL bind the endpoint and both clients SHALL attach to it

#### Scenario: Stale endpoint after a crash
- **WHEN** the endpoint exists but no process completes the handshake
- **THEN** the next start SHALL reclaim the endpoint and bind a new host

#### Scenario: Different profiles
- **WHEN** bare A1 runs with two different profile roots
- **THEN** each profile SHALL have its own host, registry, and agents without cross-visibility

### Requirement: Resident processes are started outside terminal containment
The host and every agent worker SHALL be started outside the launching terminal's console, session, and launch-instance containment through the native resident-spawn mode. On Windows it SHALL start detached with no console window, SHALL break away from or launch outside a kill-on-close job object when the caller runs inside one, and SHALL report the detachment mode used. On macOS it SHALL start a new session and adopt the per-user bootstrap namespace before starting work. On Linux it SHALL start a new session with null standard streams and SHALL detect logout policies that terminate user processes. When survival past terminal or session closure cannot be established, A1 SHALL report a degraded detachment state and SHALL show a one-time notice rather than claim survival.

#### Scenario: Close Windows Terminal
- **WHEN** the Windows Terminal window running bare `a1` is closed
- **THEN** the host and workers SHALL keep running and a later `a1` SHALL reattach

#### Scenario: Launch from a kill-on-close job
- **WHEN** bare `a1` starts inside a job object configured to kill processes when it closes, such as a Windows OpenSSH session
- **THEN** the host SHALL be started outside that job and SHALL survive the session's end, or A1 SHALL report the degraded mode

#### Scenario: Linux logout kills user processes
- **WHEN** the login manager is configured to kill user processes at logout and lingering is disabled
- **THEN** host status SHALL report the degraded state with the actionable lingering hint

### Requirement: Each agent runs in an isolated worker process
Each resident agent SHALL run in its own worker process that hosts exactly one Pi agent session runtime through documented public Pi SDK entry points behind the A1 engine adapter. Workers SHALL NOT share a Pi runtime, process globals, or event loop with the host, another worker, or a client. Workers SHALL NOT be terminated by a host exit. A worker SHALL own its agent's session file for as long as it runs, and A1 SHALL permit at most one live worker per session file.

#### Scenario: One worker crashes
- **WHEN** an agent worker exits unexpectedly
- **THEN** the host, every other worker, and every client SHALL continue unaffected

#### Scenario: Open a session already held
- **WHEN** a user selects a session file already owned by a live worker
- **THEN** A1 SHALL focus the owning tab and SHALL NOT start a second worker on that file

### Requirement: Host, worker, and client exchanges use a generation-stable typed protocol
Every connection SHALL begin with a handshake carrying role, protocol generation, build, supported features, and credentials. Within one generation, messages and fields SHALL change only additively with defaulted optional fields and unknown-value fallbacks, and a missing optional method SHALL disable only that operation. A generation mismatch SHALL fail with a typed incompatibility outcome. Frames SHALL be bounded. Every command SHALL carry an agent identity and unique correlation identity and SHALL resolve exactly one terminal outcome of accepted, rejected, completed, failed, timed-out, or cancelled. Registry mutations SHALL use expected revisions and SHALL apply atomically or be rejected.

#### Scenario: Newer client, same generation
- **WHEN** a client from a newer release attaches to an older host of the same generation
- **THEN** the attach SHALL succeed and only operations the host lacks SHALL be unavailable

#### Scenario: Cancellation races completion
- **WHEN** a command's cancellation and completion occur concurrently
- **THEN** exactly one terminal outcome SHALL be reported and no effect SHALL be applied twice

#### Scenario: Oversized frame
- **WHEN** a peer sends a frame above the negotiated limit
- **THEN** the receiver SHALL reject that frame and SHALL keep unrelated agents and connections healthy

### Requirement: Reattach uses an authoritative snapshot and sequenced events
Attaching to an agent SHALL deliver either the sequenced events after the client's last position, when still within the bounded replay window, or an authoritative snapshot followed by sequenced events. A snapshot SHALL contain the committed transcript read through the Pi session manager, in-flight assistant and tool state, queue, model, thinking level, compaction state, pending extension requests, status, and saved draft. A detected sequence gap SHALL trigger resynchronization rather than guessed state. Terminal logs and rendered output SHALL NOT be used to reconstruct state.

#### Scenario: Reattach after a long detach
- **WHEN** a client attaches after more events than the replay window were produced
- **THEN** the host SHALL send a snapshot and the client SHALL render the complete current state

#### Scenario: Event gap
- **WHEN** a client observes a missing sequence number
- **THEN** it SHALL request resynchronization and SHALL NOT render a partial transcript as complete

### Requirement: Slow clients never stall agents
The host SHALL bound every client's queued output. Streaming deltas for the same message SHALL be replaceable in the queue. A client that exceeds its window SHALL receive a resynchronization notice followed by a fresh snapshot. The host SHALL NOT block a worker, another client, or registry writes on a slow client. Workers SHALL bound their unacknowledged event buffer and SHALL degrade to snapshot-only delivery on overflow.

#### Scenario: Suspended terminal
- **WHEN** one attached terminal stops reading output while agents stream
- **THEN** agents and other clients SHALL continue at normal speed and the stalled client SHALL resynchronize when it resumes

### Requirement: The agent registry is durable and single-writer
The host SHALL be the only writer of a per-profile agent registry that is separate from the release control store. The registry SHALL use write-ahead logging with full synchronous durability and conditional transitions. It SHALL record each agent's identity, display name and name source, order, cwd, session location, desired state, lifecycle, attention and seen positions, verified worker identity and release, restart budget, last exit, and bounded draft. Every mutation SHALL be committed before its effects are acknowledged. The registry SHALL NOT store credentials, environment values, or transcript content. An unreadable registry SHALL be preserved under a timestamped name and replaced by an empty one with a visible notice.

#### Scenario: Host killed right after a rename
- **WHEN** a rename is acknowledged and the host is then killed
- **THEN** the next host SHALL present the new name

#### Scenario: Corrupt registry
- **WHEN** the registry cannot be opened or fails its integrity check
- **THEN** the host SHALL move it aside, start empty, and tell the user where it was moved and that sessions remain available through `/resume`

### Requirement: Ownership is verified before adoption or termination
The host SHALL authenticate clients with an owner-only secret and workers with a per-agent secret together with process identity and native start identity. The endpoint SHALL be restricted to the owning user. The host SHALL adopt, signal, or terminate a worker only after verifying its recorded native identity. An unverifiable process SHALL be left untouched and reported.

#### Scenario: Process identifier reuse
- **WHEN** a recorded worker process identifier now belongs to an unrelated process
- **THEN** the host SHALL NOT adopt or terminate it and SHALL treat the agent's worker as gone

#### Scenario: Another local user connects
- **WHEN** a process of a different operating-system user attempts to connect
- **THEN** the connection SHALL be refused by endpoint access control

### Requirement: Crashed and hung workers restart within a bounded budget
The host SHALL detect worker exit immediately and worker hangs through heartbeats with a bounded timeout, terminating a verified hung worker with graceful-then-forced escalation. A crashed agent SHALL restart by resuming its session with increasing backoff. After three restarts within ten minutes it SHALL become failed and require an explicit retry, fresh start, or close. A restart SHALL NOT resend an interrupted prompt or replay tool calls.

#### Scenario: Worker hangs
- **WHEN** a worker stops answering heartbeats
- **THEN** the host SHALL terminate its verified process tree within the bounded sequence and restart it from its session

#### Scenario: Interrupted turn after restart
- **WHEN** a worker crashed after the user's prompt was persisted but before a reply settled
- **THEN** the restarted agent SHALL be idle, SHALL NOT resubmit the prompt, and SHALL offer it for resubmission

### Requirement: Agents survive host failure and the host heals itself
When the host exits unexpectedly, workers SHALL continue their current turns, buffer bounded events, and reconnect. Any client or worker that loses the host SHALL start a replacement through the single-instance start path. The replacement SHALL load the registry, re-admit workers whose credentials and native identity verify, and route agents whose workers are gone through crash recovery. Clients SHALL show a non-blocking reconnecting indication. After three host starts within sixty seconds, clients SHALL show a host-stopped state with restart and single-agent fallback actions, and diagnostics SHALL be preserved.

#### Scenario: Host killed during a turn
- **WHEN** the host process is killed while an agent streams
- **THEN** the agent SHALL finish its turn, a replacement host SHALL adopt it, and an attached client SHALL show the complete turn

#### Scenario: Host killed with no client attached
- **WHEN** the host dies while no terminal runs `a1`
- **THEN** a worker SHALL start the replacement host, and the next `a1` SHALL reattach without loss

### Requirement: Agents are restored after reboot or logout
When the host starts in a new boot or finds registry agents whose desired state is running without live verified workers, it SHALL restore them under a single restore gate that prevents duplicate starts. It SHALL resume each agent from its session with bounded start concurrency, SHALL NOT resume interrupted turns, SHALL keep an agent whose cwd or session is unavailable as failed with the reason and path rather than relocating it, and SHALL use the environment of the client that triggered restoration, noting that once in the tab.

#### Scenario: Reboot with three agents
- **WHEN** the machine reboots with three running agents and the user then runs `a1`
- **THEN** three tabs SHALL be restored from their sessions with all committed transcript entries and no duplicate agents

#### Scenario: Missing cwd
- **WHEN** a restored agent's cwd no longer exists
- **THEN** its tab SHALL show failed with the missing path and SHALL NOT start in another directory

### Requirement: Updates never terminate resident agents
Installing or activating a release SHALL NOT terminate the host or workers. A client SHALL attach to a compatible older host. On a generation mismatch, A1 SHALL replace the host only at a boundary where every agent is idle with no pending request, SHALL let workers re-register with the replacement, and until then SHALL offer only generation-independent listing and stopping. Workers of an older release SHALL be recycled onto the active release only at an idle boundary by resuming their sessions. Resident processes SHALL run from immutable release directories, and releases used by a live host or worker SHALL be retained.

#### Scenario: Update while an agent works
- **WHEN** the user runs `a1 update` while an agent streams
- **THEN** the agent SHALL finish its turn uninterrupted and SHALL be moved to the new release only after it is idle

#### Scenario: Incompatible host with busy agents
- **WHEN** a client of a newer generation starts while an older host has a working agent
- **THEN** the client SHALL NOT restart the host and SHALL report that the upgrade waits for idle agents

### Requirement: Resident resources are bounded and observable
A1 SHALL enforce configurable limits on agent count, concurrent starts, per-client queues, and per-agent replay windows, each with a hard cap. It MAY suspend idle agents after a configured interval when no request, queued input, or viewing client exists, and SHALL resume them transparently on focus or prompt. The host SHALL exit only when it has no running agents and no clients for ten minutes. Host and worker logs SHALL rotate, SHALL exclude prompt content and credentials, and SHALL capture worker standard error. `a1 agents host status` SHALL report host identity, build, generation, detachment mode, agent count, and log locations.

#### Scenario: Host idle with no agents
- **WHEN** the last agent is closed and no client remains attached
- **THEN** the host SHALL exit after ten minutes and remove its endpoint

#### Scenario: Idle suspension enabled
- **WHEN** idle suspension is enabled and an unviewed idle agent reaches the interval
- **THEN** its worker SHALL stop, its tab SHALL show suspended, and prompting it SHALL resume the session with no lost context

### Requirement: Resident agents have non-interactive maintenance commands
A1 SHALL provide `a1 agents` to list resident agents with identity, name, status, and cwd; `a1 agents stop <id>` and `a1 agents stop --all` to stop agents through the host; and `a1 agents host status` and `a1 agents host stop` to inspect or stop the host after stopping its agents. These commands SHALL NOT start an interactive runtime, SHALL NOT start a host merely to report that none is running, and SHALL fail concisely with nonzero status on invalid arguments.

#### Scenario: List with no host running
- **WHEN** the user runs `a1 agents` and no host is running
- **THEN** A1 SHALL report that no resident agents are running and SHALL NOT start a host

#### Scenario: Stop everything from the CLI
- **WHEN** the user runs `a1 agents stop --all`
- **THEN** every resident agent of the profile SHALL be stopped with its session left resumable

### Requirement: Resident agents can be disabled as a rollback
The `agents.resident` setting SHALL select between resident tabs and the in-process single-agent bare A1. When it is `false`, or when the host cannot be started, bare `a1` SHALL run the in-process single-agent experience; in the latter case it SHALL show one concise notice. Disabling SHALL NOT delete registry records or sessions.

#### Scenario: Host cannot start
- **WHEN** the resident spawn mode is unavailable or the host fails its start budget
- **THEN** bare `a1` SHALL start the in-process single-agent experience with one notice instead of failing to launch
