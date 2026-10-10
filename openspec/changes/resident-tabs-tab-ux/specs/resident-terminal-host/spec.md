## ADDED Requirements

### Requirement: The tab bridge reports structured A1 state and controller identity
Each A1 tab process SHALL receive a derived per-tab/per-incarnation credential and SHALL connect an authenticated bridge to the server that reports sequenced status from engine events, a heartbeat from its event loop, the Pi session file and name with the name's source, whether its last prompt was interrupted, the count of pending extension UI, trust, and permission requests, whether input is queued, and semantic requests. Status reports SHALL carry a per-incarnation sequence number, and the server SHALL discard reports from superseded incarnations or with sequence numbers not greater than the last applied one. Before terminal input from a new controller is accepted, the holder and child SHALL establish a causal input-admission boundary covering previously accepted input in native, PTY, and child buffers and acknowledge the new owner. A sideband marker acknowledgement alone SHALL NOT be treated as proof of ordering across channels. Client-scoped requests SHALL retain immutable controller identity/revision captured at command admission and SHALL be rejected when stale or ambiguous, never rebound to the controller current at execution. The server SHALL send visibility, rename, and graceful-stop notifications through the bridge; A1 SHALL reduce animation work while hidden, and a rename SHALL set the Pi session name. Bridge messages SHALL NOT carry prompt, transcript, or terminal input content. The child SHALL consume bridge credentials into private memory and remove them from inherited environments before extension loading or descendant spawn; reconnect SHALL NOT restore them to the environment. A missing bridge SHALL degrade status and disable client-scoped child requests without breaking terminal input or attach-local detach. This requirement supersedes the minimal bridge requirement added by milestone 2.

#### Scenario: Pending extension request
- **WHEN** an extension in a tab opens a confirmation
- **THEN** the bridge SHALL report needs-input until it is answered

#### Scenario: Pending trust or permission request
- **WHEN** A1 in a tab waits on a project trust or tool permission decision
- **THEN** the bridge SHALL report needs-input until the decision is made

#### Scenario: Bridge unavailable
- **WHEN** a tab's bridge cannot connect
- **THEN** the tab SHALL keep running with process-level status, terminal input and attach-local actions, while client-scoped child requests remain disabled

#### Scenario: Buffered command crosses controller transfer
- **WHEN** an old controller's command remains buffered while a new controller is acknowledged
- **THEN** its request SHALL retain the old generation or be rejected as ambiguous, SHALL NOT acquire the new identity, and SHALL affect neither client after the old generation is superseded

#### Scenario: Hidden tab throttles animation
- **WHEN** no client views a working tab
- **THEN** the server SHALL report it hidden through the bridge, A1 in the tab SHALL stop advancing animation frames, and its status reports SHALL continue

#### Scenario: Bridge carries no content
- **WHEN** the bridge traffic of a tab is captured during prompting, streaming, and an extension dialog
- **THEN** it SHALL contain no prompt text, transcript text, terminal bytes, or credentials

### Requirement: Resident resources are bounded and observable
A1 SHALL enforce configurable limits on tab count, concurrent starts, prewarmed standby tabs, idle suspension, scrollback, and client queues, each with a hard cap, declared as settings in the owned settings screen: `tabsMax` (default 10, cap 50), `tabsMaxConcurrentStarts` (default 2), `tabsPrewarm` (default 1, cap 1), `tabsSuspendIdleAfterMinutes` (default 60, `0` disables), and `tabsAutoName` (default on). An out-of-range stored value SHALL be clamped to its cap with a notice. When idle suspension is enabled, an idle tab with no pending request, queued input, or viewer SHALL stop its A1 process gracefully, show suspended, and resume its session on view; the setting text SHALL state that extension in-memory state is lost on suspension. A prewarmed standby tab SHALL be hidden, SHALL NOT own a Pi session until promoted, and SHALL start only when no visible tab start is pending. The server SHALL exit only after ten minutes with no running tabs and no clients. Logs SHALL rotate and SHALL exclude terminal content, prompt text, and credentials. Cold launch, warm tab creation, reattach first paint, input-to-process latency, and output-to-present latency SHALL be measured on Windows x64, macOS, and Linux against budgets declared in `docs/architecture/resident-tabs.md`, and a missed budget SHALL be recorded rather than omitted.

#### Scenario: Idle suspension
- **WHEN** an unviewed idle tab reaches the suspension interval
- **THEN** its A1 process SHALL stop, its chip SHALL show suspended, and viewing it SHALL resume the session with no lost transcript

#### Scenario: Busy tab is not suspended
- **WHEN** an unviewed tab has a pending extension request or queued input at the suspension interval
- **THEN** it SHALL keep running

#### Scenario: Stored limit above its cap
- **WHEN** the stored `tabsMax` is 80
- **THEN** A1 SHALL apply 50 and report the clamp once

#### Scenario: Performance budget missed
- **WHEN** a measured reattach first paint exceeds its declared budget on one platform
- **THEN** the evidence SHALL record the measurement and the miss for that platform and SHALL NOT infer a result from another platform
