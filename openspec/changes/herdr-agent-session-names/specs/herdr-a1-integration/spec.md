## ADDED Requirements

### Requirement: Generic A1 integration has independent feature switches

The private Herdr customization SHALL present one A1 plugin with a master enable switch and independent Match space color and Sync session name toggle settings. Existing stable plugin identifiers and explicit legacy color choices SHALL remain compatible. An explicitly disabled legacy plugin SHALL stay disabled. No saved unrelated preference or already-applied color/name SHALL be removed by disabling a feature. Runtime/session identity SHALL NOT be exported as a portable preference.

#### Scenario: Names enabled while colors disabled
- **WHEN** the A1 plugin and name synchronization are enabled but color matching is disabled
- **THEN** supported sidebar Rename and authoritative name updates remain available
- **AND** neither startup nor live matching changes A1 colors

#### Scenario: Colors enabled while names disabled
- **WHEN** the A1 plugin and color matching are enabled but name synchronization is disabled
- **THEN** existing color matching remains available and the plugin offers no Rename action or new name-sync work

#### Scenario: Preserve an existing disabled choice
- **WHEN** an installation has only the previous explicit disabled color-plugin preference
- **THEN** the generic plugin initially stays disabled without changing stored names or colors

#### Scenario: Master switch gates both features
- **WHEN** the plugin is disabled after a popup or async read starts
- **THEN** stale continuations cannot submit a new rename or color update
- **AND** completed changes are not undone

### Requirement: Sidebar Rename targets the clicked A1 session

The Agents context menu SHALL accept generic plugin-owned action contributions. The A1 plugin SHALL contribute Rename only for an eligible live A1 agent with fresh complete native session/runtime identity and name synchronization enabled. Rename SHALL use a native private input UI prefilled from authoritative API readback, capture the clicked terminal/machine/runtime/session and revision, and revalidate lifetime, expiry, enable state and identity before submitting a literal shared-client request. Local and remote requests SHALL use supported host execution routing. Unsupported agents SHALL retain existing menu behavior. No terminal input, private endpoint discovery, shipped mod edits, native patch or permanent local alias SHALL be used.

#### Scenario: Click a different agent from the focused one
- **WHEN** a person opens Rename on an eligible nonfocused A1 agent and submits a new name
- **THEN** only that clicked exact session changes, including when it runs on another machine
- **AND** focus and terminal topology remain unchanged

#### Scenario: Cancel or replace the target
- **WHEN** the person cancels, closes the overlay, disables name sync or the captured runtime/session is replaced
- **THEN** the pending UI cannot submit a rename against any current or replacement agent

#### Scenario: Old runtime or concurrent rename refuses the write
- **WHEN** the target lacks session.rename support, becomes unavailable or changes name revision
- **THEN** the UI reports failure/conflict without inventing a local success or overwriting the authoritative name
- **AND** any retry requires an explicit fresh read and user submission

### Requirement: Session name propagation is bidirectional and loop-free

Manual or automatic A1-origin name changes SHALL update Herdr's agent display through authoritative reporting or a read-only runtime-bound projection. An acknowledged sidebar rename SHALL persist as the same manual A1 session name and update A1 and Herdr. Display updates SHALL NOT be reinterpreted as new rename commands. Any temporary display projection SHALL be binding-scoped and discarded when stale or disabled, not a second durable name database.

#### Scenario: Rename inside A1
- **WHEN** a live A1 session changes its name through its own naming authority while synchronization is enabled
- **THEN** Herdr displays the new authoritative name without submitting an echo rename

#### Scenario: Rename inside Herdr
- **WHEN** a sidebar rename is applied by A1
- **THEN** A1 and Herdr display the same persisted name
- **AND** later automatic naming preserves that manual choice

#### Scenario: Late reply belongs to a replaced session
- **WHEN** an old name read completes after the terminal's session/runtime binding changes
- **THEN** the old result cannot restore the previous session's display name or authorize a write
