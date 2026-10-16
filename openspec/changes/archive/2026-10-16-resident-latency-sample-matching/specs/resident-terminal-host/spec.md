## MODIFIED Requirements

### Requirement: Resident resources are bounded and observable
During a resident bare-A1 launch, A1 SHALL expose only `tabsMax` and `tabsAutoName` as tab controls in Settings > Tabs. `tabsMax` SHALL appear with default 10 and range 1–50, and `tabsAutoName` SHALL appear defaulted on. A1 SHALL expose no `residentTabs` or enable/disable toggle. During `a1 solo`, the complete Tabs settings section SHALL be absent. Out-of-range `tabsMax` SHALL clamp with one notice. Unresponsive restart and stall-notice timing SHALL not be user-facing controls and SHALL use internal values of 120 and 300 seconds respectively. Concurrent starts SHALL use internal default 2 and hard cap 8; prewarm SHALL use internal count and hard cap 1. One hidden prewarmed standby MAY load Pi, settings, and extensions but SHALL own no session or writer lease before exact cwd/environment-matched promotion and SHALL start only when no visible start is pending. Every open tab SHALL retain its process until explicit close; A1 SHALL provide no idle-suspension setting, timer, lifecycle, or glyph. The server SHALL exit only after ten minutes with no running tabs, clients, holders, or standby. Logs SHALL rotate and exclude terminal content, prompt text, and credentials. Cold launch, warm creation, reattach paint/input, input-to-process, and output-to-present SHALL be measured separately on Windows x64, macOS arm64, and Linux x64 against declared budgets, recording every miss.

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

#### Scenario: Latency sample is matched to its own input
- **WHEN** the fixture echoes a processed-input line for a token before that token's measured send, such as from a late in-band standby-promotion marker
- **THEN** the measurement SHALL ignore that earlier line and time only a line stamped at or after the send
- **AND** a negative or non-numeric recorded latency SHALL fail its metric instead of being dropped from the p95 sample set
