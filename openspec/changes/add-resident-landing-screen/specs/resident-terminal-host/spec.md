# resident-terminal-host Delta

## ADDED Requirements

### Requirement: A created tab's first prompt is seeded privately
A `tab.create` request MAY carry one bounded `initialPrompt` of at most 64 KiB. Before the server starts that tab's holder, or before it announces a promoted standby as that tab, it SHALL write the text as an owner-only `seed-prompt.json` with schema `a1-tab-seed-prompt-v1` into the tab's private data directory, the same directory the holder passes to the child as `--tab-data-dir`. A failed write SHALL refuse the creation. The server SHALL hold a per-tab pending-seed flag in memory only and SHALL NOT place the text in the registry, recovery history, diagnostics, crash records, the doctor bundle, environment variables, terminal input, or any bridge message. It SHALL notify the tab's bridge with a content-free `bridge.seed` frame on bridge admission while the seed is pending, and immediately on standby promotion when the bridge is already connected, and SHALL clear the flag when the child reports `bridge.seed-consumed`. The child SHALL read the file at most once, delete it, and submit its text through the ordinary resident submission path exactly once when its shell is ready and no startup route or dialog holds the screen. The server SHALL delete an unconsumed seed when the tab is closed, stopped, or fails before consumption. The welcome SHALL advertise `bridge-seed`; peers without it ignore the field and the notice.

#### Scenario: Fresh Agent with a seed
- **WHEN** an attach client creates a tab with `initialPrompt` and the server starts a new holder
- **THEN** the seed file SHALL exist owner-only in the tab's data directory before the child starts
- **AND** the child SHALL submit the text once after its shell is ready and the file SHALL then be gone

#### Scenario: Promoted standby with a seed
- **WHEN** an attach client creates a tab with `initialPrompt` and a standby whose bridge is already connected is promoted
- **THEN** the server SHALL write the seed file and send `bridge.seed` without text, and the child SHALL submit the seed once

#### Scenario: Seed outlives nothing
- **WHEN** a tab with an unconsumed seed is closed or fails before its child consumes it
- **THEN** the server SHALL delete the seed file and the text SHALL appear in no other resident artifact

#### Scenario: Oversized seed
- **WHEN** an `initialPrompt` exceeds 64 KiB
- **THEN** the server SHALL refuse the creation with `tab.create-failed` and write nothing

## MODIFIED Requirements

### Requirement: The tab bridge reports structured A1 state and controller identity
Each A1 tab process SHALL receive a derived per-tab/per-incarnation credential and SHALL connect an authenticated bridge to the server that reports sequenced status from engine events, an event-loop heartbeat, its resolved A1 accent color, the Pi session file and name with name source, whether its last prompt was interrupted, pending extension UI/trust/permission request count, queued-input state, and origin-stamped `/quit` and empty-editor `Ctrl+D` requests. The server SHALL drop reports from superseded incarnations or non-increasing sequences. Before input from a new controller is accepted, holder and child SHALL establish the milestone-1 causal boundary across native, PTY, and child buffers. Client-scoped requests SHALL retain immutable controller identity/revision captured at admission and be rejected when stale or ambiguous. The server SHALL send visibility, rename, graceful-stop, and content-free seed-available notifications; hidden A1 SHALL continue advancing child-owned content and animation frames under the same render scheduling rules as viewed A1, while the host SHALL withhold inactive surface delivery and provide the latest complete resident terminal surface when the tab is viewed again; rename SHALL set the Pi session name. Bridge messages SHALL NOT carry prompts, transcripts, terminal input, or credentials. Credentials SHALL be private and removed from inherited environments before extensions or descendants. A missing bridge SHALL degrade status and disable client-scoped child requests without breaking terminal input or attach-local double-`Ctrl+C`. This requirement supersedes the minimal bridge requirement added by milestone 2.

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

#### Scenario: Seed notice carries no content
- **WHEN** the server notifies a tab that a seeded first prompt awaits it
- **THEN** the `bridge.seed` frame SHALL carry no prompt text and the child SHALL read the text only from its private seed file

