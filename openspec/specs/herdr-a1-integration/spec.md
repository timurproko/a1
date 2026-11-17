# herdr-a1-integration Specification

## Purpose
TBD - created by archiving change herdr-agent-session-names. Update Purpose after archive.

## Requirements

### Requirement: Generic A1 integration has independent feature switches

The private Herdr customization SHALL present one A1 plugin with a master enable switch and independent Match space color and Sidebar rename toggle settings. These switches SHALL NOT gate existing vanilla A1 → Herdr name reporting or display updates. Existing stable plugin identifiers and explicit legacy color choices SHALL remain compatible. An explicitly disabled legacy plugin SHALL stay disabled. No saved unrelated preference or already-applied color/name SHALL be removed by disabling a feature. Runtime/session identity SHALL NOT be exported as a portable preference.

#### Scenario: Sidebar renaming enabled while colors disabled
- **WHEN** the A1 plugin and sidebar renaming are enabled but color matching is disabled
- **THEN** supported sidebar Rename remains available
- **AND** neither startup nor live matching changes A1 colors

#### Scenario: Colors enabled while sidebar renaming disabled
- **WHEN** the A1 plugin and color matching are enabled but sidebar renaming is disabled
- **THEN** existing color matching remains available and the plugin offers no Rename action
- **AND** vanilla A1 → Herdr name updates continue unchanged

#### Scenario: Preserve an existing disabled choice
- **WHEN** an installation has only the previous explicit disabled color-plugin preference
- **THEN** the generic plugin initially stays disabled without changing stored names or colors

#### Scenario: Master switch gates both features
- **WHEN** the plugin is disabled after a context menu, inline editor or async read starts
- **THEN** stale continuations cannot submit a new rename or color update
- **AND** completed changes are not undone

### Requirement: Sidebar Rename targets the clicked A1 session

The Agents context menu SHALL accept generic plugin-owned action contributions. The A1 plugin SHALL contribute Rename only for an eligible live A1 agent with fresh complete native session/runtime identity and sidebar renaming enabled. Rename SHALL edit the name in-place in the Agents row, matching Spaces and Tabs with selected existing text, compact save/cancel controls, Enter to save and Escape/blur to cancel. It SHALL NOT open a modal. The mounted Agents view SHALL consume only an ephemeral expiring edit request, expand a compact sidebar if needed, and allocate/focus native input state outside render. The editor SHALL prefill from authoritative API readback, capture the clicked terminal/machine/runtime/session and revision, and revalidate editor lifetime, expiry, enable state and identity before submitting a literal shared-client request. Local and remote requests SHALL use supported host execution routing. Unsupported agents SHALL retain existing menu behavior. No terminal input, private endpoint discovery, shipped mod edits, native patch or permanent local alias SHALL be used.

#### Scenario: Click a different agent from the focused one
- **WHEN** a person opens Rename on an eligible nonfocused A1 agent and submits a new name
- **THEN** only that clicked exact session changes, including when it runs on another machine
- **AND** focus and terminal topology remain unchanged

#### Scenario: Cancel or replace the target
- **WHEN** the person cancels, blurs the inline editor, disables sidebar renaming or the captured runtime/session is replaced
- **THEN** the pending UI cannot submit a rename against any current or replacement agent

#### Scenario: Rename uses the same in-place UX as Spaces and Tabs
- **WHEN** a person chooses Rename from an eligible agent's context menu
- **THEN** its Agents row shows a focused native name input with the existing name selected and compact save/cancel controls
- **AND** no rename modal or dialog opens

#### Scenario: Old runtime or concurrent rename refuses the write
- **WHEN** the target lacks session.rename support, becomes unavailable or changes name revision
- **THEN** the UI reports failure/conflict without inventing a local success or overwriting the authoritative name
- **AND** any retry requires an explicit fresh read and user submission

### Requirement: Preserve vanilla name updates without a second sync path

Existing vanilla A1 → Herdr name reporting and display behavior SHALL remain unchanged for manual and automatic naming, regardless of plugin master or feature settings. An acknowledged sidebar rename SHALL persist through the ordinary manual A1 naming authority and its existing notifications, allowing the native reporting path to update Herdr. The plugin SHALL NOT add name polling, display projections, terminal-title overrides, a second name database or echo rename commands.

#### Scenario: Rename inside A1
- **WHEN** a live A1 session changes its name through its own naming authority
- **THEN** vanilla Herdr continues displaying the new authoritative name without a plugin sync path or echo rename

#### Scenario: Plugin disabled leaves native updates intact
- **WHEN** the plugin master switch or Sidebar rename setting is off and A1 changes its session name
- **THEN** the existing vanilla A1 → Herdr name update still occurs unchanged

#### Scenario: Rename inside Herdr
- **WHEN** a sidebar rename is applied by A1
- **THEN** A1 and Herdr display the same persisted name
- **AND** later automatic naming preserves that manual choice

#### Scenario: Late reply belongs to a replaced session
- **WHEN** an old name read completes after the terminal's session/runtime binding changes
- **THEN** the old result cannot restore the previous session's display name or authorize a write
