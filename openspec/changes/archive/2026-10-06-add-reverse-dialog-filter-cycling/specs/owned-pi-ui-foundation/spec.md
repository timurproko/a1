## ADDED Requirements

### Requirement: Tab-filtered dialogs cycle backward with reverse Tab

Every bare-A1 dialog in which `Tab` changes a filter or result scope SHALL treat `Shift+Tab` as the reverse transition through that same ordered state set. This SHALL cover the Models dialog's `all | scoped` filter, Resume Session's current-folder/all scope, and Session Tree's `all | no tools | user | labeled` filter. Reverse cycling SHALL wrap at the first state and SHALL preserve the same query, selection-restoration, loading, folding-reset, and other state-transition semantics applicable to forward cycling.

Reverse Tab SHALL be handled only while one of these dialogs owns input. It SHALL NOT assign Shift+Tab to the ordinary bare-A1 agent input, autocomplete, suggestion acceptance, comparison profile, or dialogs where Tab does not change a filter. Existing visible shortcut hints SHALL remain forward-only and SHALL NOT add Shift+Tab; Models and Session Tree SHALL continue to show `Tab filter`, and Resume Session SHALL continue to show `Tab scope`.

#### Scenario: Cycle the Session Tree filter backward
- **WHEN** Session Tree has `all` active and the user presses `Shift+Tab`
- **THEN** `labeled` SHALL become active through the existing reverse-cycle path
- **AND** the current query and nearest applicable selection SHALL be preserved
- **AND** the footer SHALL continue to show `Tab filter` without a Shift+Tab hint

#### Scenario: Reverse the Models filter
- **WHEN** the Models dialog has `all` active with a query and selected model and the user presses `Shift+Tab`
- **THEN** `scoped` SHALL become active through the existing filter transition
- **AND** the query SHALL remain and the selected model SHALL be restored when it exists in the destination rows
- **AND** the footer SHALL continue to show only `Tab filter`

#### Scenario: Reverse the Resume Session scope
- **WHEN** Resume Session is showing the current-folder scope and the user presses `Shift+Tab`
- **THEN** it SHALL switch through the existing scope transition to all sessions
- **AND** existing search, loading, and selection behavior SHALL be retained
- **AND** the header hint SHALL continue to show only `Tab scope`

#### Scenario: Keep reverse Tab modal-local
- **WHEN** no Tab-filtered dialog owns input and the ordinary bare-A1 agent input receives `Shift+Tab`
- **THEN** it SHALL retain its established unassigned and inert behavior
- **AND** no new Shift+Tab action SHALL appear in startup help, Keyboard Shortcuts, or modal shortcut hints
