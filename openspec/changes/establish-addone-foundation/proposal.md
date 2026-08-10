## Why

The v2 prototype proves the value of a multi-agent terminal workspace, but its UI and agent lifecycle are embedded in Pi through private TUI bridges, process-global reload state, and exact-version host profiles. AddOne needs an independent architecture that preserves the strongest v2 UX while allowing Pi upgrades, worker restarts, third-party Pi extensions, and non-Pi terminal agents without putting the user in the critical path for every regression.

## What Changes

- Introduce AddOne as a standalone terminal application that owns its complete shell, including workspaces, tabs, sidebar, structured conversation views, terminal views, input routing, drafts, status, and notifications.
- Introduce a persistent supervisor that owns durable logical-agent identity, process generations, workspace state, session references, leases, recovery, and communication with disposable UI clients.
- Introduce a capability-based agent-driver boundary so the UI and supervisor do not depend on Pi-specific or PTY-specific APIs.
- Introduce a Managed Pi driver that runs an exactly pinned Pi runtime through its documented RPC interface and maps Pi messages, tools, sessions, queues, retries, compaction, and portable extension UI requests into AddOne events.
- Introduce a generic PTY driver for native Pi, Claude Code, Codex, shells, and arbitrary commands, treating terminal output as an opaque surface rather than scraping it for semantic agent state.
- Support basic migration of the v2 tab strip, workspace sidebar, status presentation, structured transcript, and terminal-emulation UX through AddOne-owned models and components.
- Persist AddOne control-plane state independently from Pi JSONL sessions and enforce one live writer for each resumable session.
- Install Pi runtimes and extension profiles side by side so candidate updates can be tested before promotion and older agents can continue using their existing runtime.
- Establish hermetic driver, PTY, recovery, compatibility, and regression-test foundations, including an independent evaluator-agent path for inspecting candidate terminal instances.
- Explicitly exclude private Pi host bridges, TUI prototype patching, whole-system `/reload` fanout, daemon hot-code swapping, and process-global reload-survival state from the new architecture.
- Defer full migration of Git, plans, answer/refinement flows, advanced paste/chips, modes, intro/outro animation, and complete v2 visual parity to follow-up changes.

## Capabilities

### New Capabilities
- `addone-shell`: Standalone AddOne workspace, tab, sidebar, structured-conversation, terminal-surface, input-routing, draft, status, and notification behavior.
- `agent-supervision`: Durable logical-agent and workspace lifecycle, process generations, leases, UI reconnection, recovery, and capability-aware driver coordination.
- `managed-pi-runtime`: Managed Pi RPC execution, session continuity, normalized events, pinned runtimes, extension profiles, and portable Pi extension interaction.
- `terminal-agent-runtime`: Opaque PTY execution for native Pi and other command-line agents, including input, resize, terminal frames, exit, and driver-specific resume capabilities.
- `isolated-regression-testing`: Hermetic scenario execution, compatibility matrices, PTY artifacts, deterministic assertions, and evaluator-agent regression inspection.

### Modified Capabilities

None. This proposal establishes the first AddOne capabilities; no main specifications currently exist.

## Impact

- Creates a new standalone AddOne application and supervisor rather than extending the v2 Pi-hosted runtime in place.
- Establishes stable AddOne protocols between the UI, supervisor, and agent drivers.
- Adds controlled dependencies on a pinned outer TUI toolkit, SQLite or an equivalent transactional control store, Pi RPC worker distributions, and PTY/terminal-emulation libraries.
- Uses v2 as a behavior and UX reference while selectively harvesting pure models, rendering calculations, PTY knowledge, and tests.
- Restricts Pi package imports to Pi driver/adapter boundaries and PTY dependencies to terminal-driver boundaries.
- Changes the future update model from in-process reload fanout to idle drain, process replacement, exact-session verification, candidate certification, and rollback.
