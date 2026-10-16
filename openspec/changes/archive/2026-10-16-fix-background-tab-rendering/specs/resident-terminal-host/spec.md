## MODIFIED Requirements

### Requirement: The tab bridge reports structured A1 state and controller identity
Each A1 tab process SHALL receive a derived per-tab/per-incarnation credential and SHALL connect an authenticated bridge to the server that reports sequenced status from engine events, an event-loop heartbeat, its resolved A1 accent color, the Pi session file and name with name source, whether its last prompt was interrupted, pending extension UI/trust/permission request count, queued-input state, and origin-stamped `/quit` and empty-editor `Ctrl+D` requests. The server SHALL drop reports from superseded incarnations or non-increasing sequences. Before input from a new controller is accepted, holder and child SHALL establish the milestone-1 causal boundary across native, PTY, and child buffers. Client-scoped requests SHALL retain immutable controller identity/revision captured at admission and be rejected when stale or ambiguous. The server SHALL send visibility, rename, and graceful-stop notifications; hidden A1 SHALL continue advancing child-owned content and animation frames under the same render scheduling rules as viewed A1, while the host SHALL withhold inactive surface delivery and provide the latest complete resident terminal surface when the tab is viewed again; rename SHALL set the Pi session name. Bridge messages SHALL NOT carry prompts, transcripts, terminal input, or credentials. Credentials SHALL be private and removed from inherited environments before extensions or descendants. A missing bridge SHALL degrade status and disable client-scoped child requests without breaking terminal input or attach-local double-`Ctrl+C`. This requirement supersedes the minimal bridge requirement added by milestone 2.

#### Scenario: Pending extension request
- **WHEN** an extension opens a confirmation
- **THEN** the bridge SHALL report needs-input until answered

#### Scenario: Pending trust or permission request
- **WHEN** A1 waits for trust or permission
- **THEN** the bridge SHALL report needs-input until resolved

#### Scenario: Per-tab accent
- **WHEN** a tab's resolved A1 accent changes
- **THEN** its next sequenced bridge status SHALL report that accent without carrying terminal or prompt content

#### Scenario: Bridge unavailable
- **WHEN** a bridge cannot connect
- **THEN** the tab SHALL continue with process-level status, terminal input, and attach-local actions while client-scoped child requests stay disabled

#### Scenario: Buffered command crosses transfer
- **WHEN** an old controller's command remains buffered while a new controller is acknowledged
- **THEN** it SHALL retain the old generation or be rejected and SHALL affect neither client after supersession

#### Scenario: Hidden tab throttles animation
- **WHEN** no client views a working tab while streamed content and child-owned animations advance
- **THEN** the tab SHALL continue normal child rendering into its resident terminal while the host throttles only inactive surface delivery to attach clients
- **AND** viewing the tab SHALL present its latest complete surface without a visibility-triggered catch-up burst

#### Scenario: Bridge carries no content
- **WHEN** traffic is captured during prompts, streaming, and dialogs
- **THEN** it SHALL contain no prompt text, transcript text, terminal bytes, or credentials
