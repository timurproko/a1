## Purpose

Defines held future split-layout and multiplexer behavior inside an accepted resident terminal tab, without restoring the removed structured-agent workspace or moving terminal authority into Node.

## ADDED Requirements

### Requirement: A split tab has one revisioned authoritative tree
A split-capable resident tab SHALL own one bounded rooted split tree. Internal nodes SHALL declare horizontal or vertical division and a bounded ratio; every leaf SHALL reference one stable pane identity and exactly one resident holder/session identity. The native resident host SHALL own the authoritative topology revision. A create, split, close, move, ratio, or focus mutation SHALL name an expected revision and SHALL either commit one complete newer valid tree or be rejected without partial effects.

#### Scenario: Two clients mutate one layout revision
- **WHEN** two clients submit different split mutations against the same current revision
- **THEN** exactly one mutation SHALL commit, the other SHALL receive the newer authoritative topology, and no partial pane SHALL be created

#### Scenario: Invalid tree is requested
- **WHEN** a mutation would exceed pane/depth limits or introduce a missing, duplicate, cyclic, or ratio-invalid node
- **THEN** the host SHALL reject it without changing topology or process ownership

### Requirement: Every split leaf remains an isolated resident session
Each pane SHALL have its own native holder, pseudoterminal, verified process tree, retained terminal model, dimensions, terminal modes, flow-controlled input queue, selection, diagnostics, and recovery identity. A holder or child failure SHALL affect only its pane. A server or client failure SHALL leave every verified holder and retained screen alive under the accepted resident credentials, writer-lease, identity, and epoch rules.

#### Scenario: One pane holder crashes
- **WHEN** one holder in a four-pane tab exits unexpectedly
- **THEN** only that pane SHALL enter recovery while the other three remain visible, interactive, and unchanged

#### Scenario: One pane blocks input
- **WHEN** one pane's child stops reading and fills its bounded writer queue
- **THEN** that pane SHALL reject further input visibly without blocking another pane, holder, client, or the server

### Requirement: Native code owns split composition and focused input
The native terminal host SHALL own pane rectangles, clipping, borders, titles, damage scheduling, synchronized presentation, cursor placement, focus ordering, terminal-mode-aware keyboard/text/paste/mouse/wheel encoding, pane-relative coordinates, selection, clipboard transfer, and outer-terminal restoration. Node SHALL exchange only bounded typed topology, lifecycle, and status messages and SHALL NOT receive PTY bytes, individual pane input events, retained cells, or final rendered frames.

#### Scenario: Focus changes while input arrives
- **WHEN** pane focus and a terminal input event race
- **THEN** the host SHALL order both atomically and deliver the input only to the pane focused at its native acceptance point

#### Scenario: Node control plane restarts
- **WHEN** Node-side control code restarts while split holders and the native host survive
- **THEN** pane I/O and presentation SHALL continue from retained native authority without replaying terminal bytes through Node

### Requirement: Split resources are bounded per pane and tab
A split implementation SHALL enforce a maximum pane count and depth plus per-pane and aggregate limits for scrollback, queued input, render work, processes, memory, handles, logs, and recovery data. A pane that exceeds its limit SHALL receive a documented pane-local degraded, paused, or failed outcome and SHALL NOT exhaust or corrupt sibling panes or the resident server.

#### Scenario: Hidden split tab produces high-rate output
- **WHEN** every pane in an unviewed split tab produces output near its allowed rate
- **THEN** each holder SHALL continue bounded parsing without painting, and aggregate limits SHALL produce explicit local outcomes rather than unbounded growth

### Requirement: Split layouts preserve single-pane rollback
Split capability SHALL remain independently disableable. Disabling it SHALL preserve resident session records and present surviving sessions as ordinary single-pane tabs. When several panes exist, A1 SHALL require an explicit user choice for any stop or consolidation action and SHALL NOT silently terminate or delete a session.

#### Scenario: Disable split capability with three live panes
- **WHEN** rollback is requested while three pane sessions remain live
- **THEN** A1 SHALL preserve all three as independently reachable resident sessions unless the user explicitly stops one

### Requirement: Multipane support is certified independently
Before split layouts are enabled on a platform, the exact packaged candidate SHALL pass deterministic topology and input-ordering tests; simultaneous high-rate output; rapid focus, controller, resize, and terminal-size churn; Unicode, paste, mouse, selection, clipboard, and alternate-screen workloads; blocked-writer and malformed-output isolation; pane, holder, server, and client death; bounded resource checks; cleanup; parent-terminal restoration; and manual or isolated-worker physical acceptance. Single-pane acceptance and another platform's evidence SHALL NOT substitute. Physical automation SHALL NOT run on an active workstation.

#### Scenario: Single-pane resident tabs are accepted
- **WHEN** resident tabs pass every single-pane reliability and physical gate but no exact multipane evidence exists
- **THEN** split layouts SHALL remain disabled and no multipane support claim SHALL be made
