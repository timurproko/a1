## ADDED Requirements

### Requirement: The tab bridge reports structured A1 state and controller identity
Each A1 tab process SHALL receive a derived per-tab/per-incarnation credential and SHALL connect an authenticated bridge to the server that reports sequenced status from engine events, an event-loop heartbeat, its resolved A1 accent color, the Pi session file and name with name source, whether its last prompt was interrupted, pending extension UI/trust/permission request count, queued-input state, and origin-stamped `/quit` and empty-editor `Ctrl+D` requests. The server SHALL drop reports from superseded incarnations or non-increasing sequences. Before input from a new controller is accepted, holder and child SHALL establish the milestone-1 causal boundary across native, PTY, and child buffers. Client-scoped requests SHALL retain immutable controller identity/revision captured at admission and be rejected when stale or ambiguous. The server SHALL send visibility, rename, and graceful-stop notifications; hidden A1 SHALL reduce animation work and rename SHALL set the Pi session name. Bridge messages SHALL NOT carry prompts, transcripts, terminal input, or credentials. Credentials SHALL be private and removed from inherited environments before extensions or descendants. A missing bridge SHALL degrade status and disable client-scoped child requests without breaking terminal input or attach-local double-`Ctrl+C`. This requirement supersedes the minimal bridge requirement added by milestone 2.

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
- **WHEN** no client views a working tab
- **THEN** A1 SHALL stop advancing child-owned animation frames while heartbeat and status continue

#### Scenario: Bridge carries no content
- **WHEN** traffic is captured during prompts, streaming, and dialogs
- **THEN** it SHALL contain no prompt text, transcript text, terminal bytes, or credentials

### Requirement: Resident resources are bounded and observable
During a resident bare-A1 launch, A1 SHALL expose only `tabsMax` and `tabsAutoName` as tab controls in Settings > Tabs. `tabsMax` SHALL appear with default 10 and range 1–50, and `tabsAutoName` SHALL appear defaulted on. A1 SHALL expose no `residentTabs` or enable/disable toggle. During `a1 solo`, the complete Tabs settings section SHALL be absent. Out-of-range `tabsMax` SHALL clamp with one notice. Unresponsive restart and stall-notice timing SHALL not be user-facing controls and SHALL use internal values of 120 and 300 seconds respectively. Concurrent starts SHALL use internal default 2 and hard cap 8; prewarm SHALL use internal count and hard cap 1. One hidden prewarmed standby MAY load Pi, settings, and extensions but SHALL own no session or writer lease before exact cwd/environment-matched promotion and SHALL start only when no visible start is pending. Every open tab SHALL retain its process until explicit close; A1 SHALL provide no idle-suspension setting, timer, lifecycle, or glyph. The server SHALL exit only after ten minutes with no running tabs and no clients. Logs SHALL rotate and exclude terminal content, prompt text, and credentials. Cold launch, warm creation, reattach paint/input, input-to-process, and output-to-present SHALL be measured separately on Windows x64, macOS arm64, and Linux x64 against declared budgets, recording every miss.

#### Scenario: Bare A1 uses tabs
- **WHEN** bare `a1` launches on a supported platform
- **THEN** A1 SHALL use the resident host and present the tab strip

#### Scenario: Solo mode omits tab settings
- **WHEN** the user runs `a1 solo` and opens Settings
- **THEN** A1 SHALL use the direct path without a tab strip
- **AND** Settings SHALL contain no Tabs section

#### Scenario: Stored tab limit above cap
- **WHEN** stored `tabsMax` is 80
- **THEN** A1 SHALL apply 50 and report the clamp once

#### Scenario: Prewarmed tab is promoted
- **WHEN** a standby exactly matches cwd and environment
- **THEN** it SHALL reserve and commit a new session identity before accepting input and then become visible

#### Scenario: Open tab remains resident
- **WHEN** an open idle tab remains unviewed for any duration
- **THEN** its holder and A1 process SHALL remain running until explicit close

#### Scenario: Performance budget missed
- **WHEN** one platform exceeds a declared budget
- **THEN** evidence SHALL record that value and miss without inference from another platform

## REMOVED Requirements

### Requirement: A minimal tab bridge reports readiness, session, and working state
**Reason**: Milestone 5 replaces the minimal readiness/session/working bridge with the complete structured bridge, per-tab accent, pending-request state, heartbeat, visibility, rename, graceful stop, and controller-attributed detach contract.

**Migration**: Use "The tab bridge reports structured A1 state and controller identity".
