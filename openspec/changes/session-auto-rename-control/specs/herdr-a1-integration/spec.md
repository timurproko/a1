## REMOVED Requirements

### Requirement: Generic A1 integration has independent feature switches
**Reason**: The Sidebar rename feature is explicitly retired; the replacement requirement retains only supported plugin/color controls and legacy preference readability.
**Migration**: Existing master and color choices remain compatible. Ignore the retired renameSession field without restoring its UI.

### Requirement: Sidebar Rename targets the clicked A1 session
**Reason**: Agents-sidebar renaming and its inline editor are explicitly removed.
**Migration**: External applications retain the existing session.rename API; users retain A1-local naming and tab/space renaming.

### Requirement: Preserve vanilla name updates without a second sync path
**Reason**: Replace sidebar-specific scenarios with external-API naming scenarios while retaining unconditional native name reporting.
**Migration**: Continue the existing native A1-to-Herdr reporting path with no new sync layer.

## ADDED Requirements

### Requirement: A1 plugin retains color controls without sidebar naming

The private Herdr customization SHALL retain one A1 plugin with its stable identifiers, master enable switch and Match space color setting. It SHALL NOT expose the retired Sidebar rename setting. These switches SHALL NOT gate vanilla A1-to-Herdr name reporting or display updates. Existing explicit legacy color choices SHALL remain compatible, and an explicitly disabled legacy plugin SHALL stay disabled. Old preferences containing the retired renameSession field SHALL remain readable without restoring sidebar renaming or changing unrelated preferences. Disabling the plugin or a feature SHALL NOT remove saved names or colors. Runtime/session identity SHALL NOT be exported as a portable preference.

#### Scenario: Color matching remains independent of naming
- **WHEN** the A1 plugin and color matching are enabled
- **THEN** startup and live color matching remain available without any sidebar Rename setting or action
- **AND** native A1-to-Herdr name updates continue unchanged

#### Scenario: Preserve an existing disabled choice
- **WHEN** an installation has only the previous explicit disabled color-plugin preference
- **THEN** the generic plugin initially stays disabled without changing stored names or colors

#### Scenario: Read old sidebar preferences safely
- **WHEN** an old preference export contains renameSession set to true
- **THEN** it remains readable but cannot expose a sidebar Rename action
- **AND** unrelated preferences and color choices remain intact

#### Scenario: Master switch still gates color effects
- **WHEN** the plugin is disabled after asynchronous color work starts
- **THEN** stale continuations cannot submit a new color update
- **AND** completed changes and native name reporting are not undone

### Requirement: Agents sidebar does not offer session renaming

The private Herdr customization SHALL NOT offer an Agents-sidebar Rename action, mount an agent inline name editor or submit session.rename from that sidebar, regardless of A1 plugin enablement, old rename preferences, agent identity or machine. Existing Pin, Close, navigation and tab/space renaming SHALL remain unchanged. The public A1 session.rename API SHALL remain available to external applications; removing the sidebar affordance SHALL NOT remove backend naming authority or add terminal-input, local-alias or title-override fallbacks.

#### Scenario: Eligible A1 agent no longer offers Rename
- **WHEN** a person opens the Agents context menu on a local or remote A1 agent
- **THEN** no Rename item is offered and no inline name editor can be opened
- **AND** existing Pin and Close actions remain available

#### Scenario: Retired preference cannot restore the action
- **WHEN** the A1 plugin is enabled and old preferences enable sidebar renaming
- **THEN** agent rendering and menus still cannot initiate a rename

#### Scenario: Other naming surfaces remain available
- **WHEN** a person renames a tab or space, or an external client invokes session.rename
- **THEN** the existing supported naming path remains available without the removed Agents-sidebar feature

### Requirement: Native session name reporting remains independent of sidebar controls

Existing vanilla A1-to-Herdr name reporting and display behavior SHALL remain unchanged for manual and automatic naming, regardless of plugin settings. External API renames SHALL persist through the ordinary manual A1 naming authority and its existing notifications, allowing native reporting to update Herdr. The plugin SHALL NOT add name polling, display projections, terminal-title overrides, a second name database or echo rename commands.

#### Scenario: Rename inside A1
- **WHEN** a live A1 session changes its name through its own naming authority
- **THEN** vanilla Herdr continues displaying the authoritative name without a plugin sync path or echo rename

#### Scenario: Plugin disabled leaves native updates intact
- **WHEN** the plugin master switch or color setting is off and A1 changes its session name
- **THEN** the existing vanilla A1-to-Herdr name update still occurs unchanged

#### Scenario: External API rename remains authoritative
- **WHEN** an external application's session.rename request is applied by A1
- **THEN** A1 and Herdr display the same persisted name
- **AND** later automatic naming preserves that manual choice
