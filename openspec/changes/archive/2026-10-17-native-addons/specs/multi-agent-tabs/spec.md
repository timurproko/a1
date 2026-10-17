## MODIFIED Requirements

### Requirement: Bare A1 runs one resident tab when opted in
On Windows x64, macOS, and Linux, when the A1 setting `residentTabs` is enabled, bare `a1` without a session selection SHALL ensure the profile's resident server before the launch guardian starts, then run the terminal host's attach role, hosted by the Node runtime through the release's fixed role entry, as the launch instance's root instead of the direct owned UI. With no tab, the server SHALL create one A1 tab running `bin/ui.js --tab` in the client's launch cwd; with an existing tab, the client SHALL view it. Each tab process SHALL receive its own launch runtime identity, distinct from every other tab incarnation and launch instance. The attach client SHALL draw a one-row strip with the tab's status glyph and name above the tab's surface. While one client is attached, another bare `a1` of the same profile SHALL be refused with a message naming the other terminal and SHALL NOT start a direct session. When the terminal host is missing, the platform is unsupported, resident survival cannot be verified, or the server is incompatible, blocked, or cannot start, bare `a1` SHALL run the direct single-agent owned UI and show one notice naming the reason. With the setting at its default `false`, bare `a1` SHALL behave exactly as without this capability. `a1 pi` and `a1 --session` SHALL keep their direct behavior.

#### Scenario: First launch with resident tabs enabled
- **WHEN** the user enables `residentTabs` and runs bare `a1` with no resident tab
- **THEN** a resident tab SHALL start the full A1 UI in the launch cwd and the strip SHALL show it starting and then idle

#### Scenario: Survival cannot be verified
- **WHEN** resident tabs are enabled but the server cannot be started outside terminal containment with verified identity
- **THEN** bare `a1` SHALL start the direct single-agent owned UI and show exactly one notice naming the reason

#### Scenario: Setting left at its default
- **WHEN** `residentTabs` is `false`
- **THEN** bare `a1` SHALL neither probe nor start the resident server and SHALL run the direct owned UI

#### Scenario: Second terminal while attached
- **WHEN** a second bare `a1` of the same profile starts while a client is attached
- **THEN** it SHALL print that `a1` is attached in another terminal, exit without starting a session, and leave the first client attached

#### Scenario: Tab runtime identity
- **WHEN** a resident tab runs beside a direct `a1` instance in the same repository
- **THEN** each SHALL have a distinct launch runtime identity and their worktree claims SHALL NOT collide

#### Scenario: Attach client process image
- **WHEN** bare `a1` attaches to a resident tab
- **THEN** the attach client's process image SHALL be the Node runtime running the fixed role entry and SHALL load the verified terminal-host addon
