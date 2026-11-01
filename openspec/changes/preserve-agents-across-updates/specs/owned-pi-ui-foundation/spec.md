## ADDED Requirements

### Requirement: Updated workspace shows truthful Agent continuity and recovery
The selected release's resident workspace SHALL preserve open Agent tabs and selection while distinguishing Agents still executing on a retained source release, Agents transferring, Agents running the target, and blocked recovery. Source-version execution SHALL NOT be labelled as completed migration merely because the workspace UI is newer. A deferred Agent SHALL remain viewable and controllable wherever its source route is healthy. A disconnected or blocked Agent SHALL retain its logical tab with a bounded reason and retry/recovery action rather than silently disappear. Upgrade state SHALL preserve existing working/attention state, avoid stealing focus or moving editor/copy-feedback geometry, and SHALL NOT hide a pending permission or extension interaction. Once an Agent actually runs the selected release it SHALL NOT show stale restart readiness for that target. Existing Notify/No behavior and automatic-update overlay/copy priority SHALL remain unchanged.

#### Scenario: New UI contains a still-working old Agent
- **WHEN** B's workspace displays an A Agent finishing a turn
- **THEN** it SHALL expose the Agent's current output and input with truthful source-version/pending-upgrade state
- **AND** it SHALL NOT claim that Agent already runs B

#### Scenario: One Agent finishes migration
- **WHEN** the target Agent becomes ready and its workspace destination commits
- **THEN** the same logical tab SHALL retain its name, order and selection with target execution state
- **AND** it SHALL show its restored session and draft without stale restart readiness for that target

#### Scenario: Handoff or source reconnect fails
- **WHEN** an existing Agent cannot complete transfer or reconnect
- **THEN** its tab SHALL remain identifiable with the failure reason and safe retry/recovery action
- **AND** unrelated tabs SHALL remain interactive without an empty-workspace success screen

#### Scenario: Migration waits on an interaction
- **WHEN** a source Agent has a pending permission, trust or extension request
- **THEN** that interaction and needs-input state SHALL stay accessible and migration SHALL defer without dismissing it or stealing focus

#### Scenario: Copy feedback overlaps migration state
- **WHEN** a copy acknowledgement appears while an old Agent still has restart readiness or pending migration
- **THEN** the existing acknowledgement lifetime, priority and editor geometry SHALL remain unchanged
