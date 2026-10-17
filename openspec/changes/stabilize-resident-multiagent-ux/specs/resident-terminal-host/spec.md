# resident-terminal-host Delta

## MODIFIED Requirements

### Requirement: Resident resources are bounded and observable
During a resident bare-A1 launch, A1 SHALL expose only `tabsAutoName` as an Agent-tab control in Settings > Tabs; it SHALL NOT expose or enforce `tabsMax`, a resident enable/disable toggle, or another user tab-count quota. During `a1 solo`, the complete Tabs settings section SHALL be absent. A legacy stored `tabsMax` property SHALL be ignored while remaining preserved by forward-compatible settings writes. Completed tab count SHALL be constrained only by successfully acquired process, persistence, containment, protocol, memory, and operating-system resources. Concurrent starts SHALL remain independently bounded by internal default 2 and hard cap 8, and prewarm SHALL use internal count and hard cap 1. One hidden prewarmed Agent MAY load Pi, settings, and extensions but SHALL own no session or writer lease before exact cwd/environment-matched promotion and SHALL start only when no visible start is pending. Every open Agent and the singleton Settings utility SHALL retain its process until explicit close; A1 SHALL provide no idle-suspension setting, timer, lifecycle, or glyph. The server SHALL exit only after ten minutes with no running tabs, clients, holders, or standby. Logs SHALL rotate and exclude terminal content, prompt text, and credentials. Cold launch, warm creation, Settings creation, reattach paint/input, input-to-process, and output-to-present SHALL be measured separately on Windows x64, macOS arm64, and Linux x64 against declared budgets, recording every miss.

#### Scenario: Bare A1 uses tabs
- **WHEN** bare `a1` launches on a supported platform
- **THEN** A1 SHALL use the resident host and present the tab strip

#### Scenario: Resident Settings omits a tab quota
- **WHEN** the user opens the resident Settings utility
- **THEN** Settings > Tabs SHALL expose automatic naming without a maximum-tabs entry
- **AND** no stored legacy value SHALL limit creation

#### Scenario: Stored tab limit above cap
- **WHEN** a profile retains a legacy `tabsMax` value such as 80
- **THEN** A1 SHALL ignore it for creation and preserve it as unknown compatibility data
- **AND** no clamp or tab-limit notice SHALL appear

#### Scenario: Solo mode omits tab settings
- **WHEN** the user runs `a1 solo` and opens Settings
- **THEN** A1 SHALL use the direct path without a tab strip
- **AND** Settings SHALL contain no Tabs section

#### Scenario: Many completed tabs remain open
- **WHEN** sequential tab starts continue to acquire all real required resources
- **THEN** the resident server SHALL retain every explicitly open tab without applying a configured or hard count refusal

#### Scenario: Concurrent starts remain bounded
- **WHEN** many creation requests arrive together
- **THEN** start work SHALL remain within the internal concurrent-start cap while completed tabs remain free of a count quota

#### Scenario: Prewarmed tab is promoted
- **WHEN** a standby exactly matches an Agent request's cwd and environment
- **THEN** it SHALL reserve and commit a new session identity before accepting input and then become visible

#### Scenario: Open tab remains resident
- **WHEN** an open idle Agent or Settings tab remains unviewed for any duration
- **THEN** its holder and child process SHALL remain running until explicit close

#### Scenario: Performance budget missed
- **WHEN** one platform exceeds a declared budget
- **THEN** evidence SHALL record that value and miss without inference from another platform

#### Scenario: Latency sample is matched to its own input
- **WHEN** a fixture echo predates its measured token send or a latency is negative or non-numeric
- **THEN** the earlier echo SHALL be ignored and the invalid metric SHALL fail rather than entering the p95 sample

## ADDED Requirements

### Requirement: The holder retains complete current terminal surfaces
Each holder SHALL drain its child PTY and update retained terminal state independently of view. A complete `Surface` SHALL contain all current rows, modes, and final cursor, never only dirty rows. Hidden tabs MAY suppress client delivery, but selection and other commit boundaries SHALL request the newest complete surface. Viewed output MAY coalesce superseded frames but SHALL continue presenting complete partial-reply states before settlement.

#### Scenario: Select a hidden streaming Agent
- **WHEN** an Agent streamed while hidden and is selected before its turn settles
- **THEN** its holder SHALL immediately emit a complete current surface containing the newest partial reply
- **AND** subsequent streamed output SHALL continue to update the viewed body

#### Scenario: Repaint after a status-only change
- **WHEN** attach must repaint an overlay or strip after the latest child output changed only some rows
- **THEN** its cached body SHALL still contain every current child row rather than only the last dirty rows

#### Scenario: Several holders drain together
- **WHEN** several Agents produce high-rate output concurrently
- **THEN** each holder SHALL drain and retain its own PTY without sharing another holder's revision, wake, render slot, or backpressure

#### Scenario: Slow client replaces frames
- **WHEN** a client cannot consume every complete frame
- **THEN** only that client's single pending frame SHALL be replaced with the newest complete state
- **AND** no holder or other client SHALL block or replay every skipped state
