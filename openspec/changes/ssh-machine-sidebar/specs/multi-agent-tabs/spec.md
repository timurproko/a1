## ADDED Requirements

### Requirement: Saved SSH machines extend the resident tab strip without changing local tabs
When at least one saved SSH machine is present, bare A1 SHALL add the machine-sidebar chevron to its existing native tab-strip row and SHALL render only the currently selected machine's tab chips and terminal surface. The expanded panel SHALL push the selected child surface to the right, preserve the tab-strip row offset, and correctly resize and route mouse, keyboard, clipboard, focus and extension text UI. Local tab state SHALL remain owned by the local resident host; each selected remote's tab state SHALL remain owned by that machine's resident host. Clicking a sidebar machine/tab SHALL use fresh, generation-fenced activation before any child input is sent. `a1 solo` and `a1 pi` SHALL NOT initialize a saved-machine sidebar, SSH connection, or remote bridge. Without saved machines, the prior single-host tab-strip and last-tab empty state SHALL remain unchanged; with saved machines and no local tabs, the chevron and `+` MAY coexist on the strip rather than the former `+`-only empty state.

#### Scenario: Saved machine sidebar and local tab
- **WHEN** bare A1 has saved SSH machines and the selected machine is Local
- **THEN** the strip SHALL show Local's tabs only and the opened sidebar SHALL push, rather than cover, Local's complete child surface

#### Scenario: Switch to a remote tab
- **WHEN** the user selects a Workbox tab from the sidebar
- **THEN** the strip SHALL show Workbox's tabs and the body SHALL show its freshly verified remote screen
- **AND** local tab content, input and session state SHALL remain unchanged

#### Scenario: No remote profiles configured
- **WHEN** bare A1 has no saved SSH machines and its last local tab closes
- **THEN** it SHALL retain the existing `+`-only tab-strip empty state without a sidebar chevron

#### Scenario: Direct comparison launch
- **WHEN** the user launches `a1 solo` or `a1 pi` with saved machine profiles present
- **THEN** neither direct route SHALL start a remote bridge or display a resident sidebar
