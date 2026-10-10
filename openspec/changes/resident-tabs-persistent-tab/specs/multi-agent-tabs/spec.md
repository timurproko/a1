## ADDED Requirements

### Requirement: Bare A1 runs one resident tab when opted in
On Windows x64, macOS, and Linux, when the A1 setting `residentTabs` is enabled, bare `a1` without a session selection SHALL ensure the profile's resident server before the launch guardian starts, then run the native attach client as the launch instance's root instead of the direct owned UI. With no tab, the server SHALL create one A1 tab running `bin/ui.js --tab` in the client's launch cwd; with an existing tab, the client SHALL view it. Each tab process SHALL receive its own launch runtime identity, distinct from every other tab incarnation and launch instance. The attach client SHALL draw a one-row strip with the tab's status glyph and name above the tab's surface. While one client is attached, another bare `a1` of the same profile SHALL be refused with a message naming the other terminal and SHALL NOT start a direct session. When the terminal host is missing, the platform is unsupported, resident survival cannot be verified, or the server is incompatible, blocked, or cannot start, bare `a1` SHALL run the direct single-agent owned UI and show one notice naming the reason. With the setting at its default `false`, bare `a1` SHALL behave exactly as without this capability. `a1 pi` and `a1 --session` SHALL keep their direct behavior.

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

### Requirement: Quitting bare A1 detaches from resident tabs
Pressing `Ctrl+C` twice within the existing clear/exit interval SHALL detach the local attach client from the tab. The attach client SHALL forward the first `Ctrl+C` to the tab unchanged and SHALL consume a second `Ctrl+C` inside the interval as the detach request without forwarding it, so a single `Ctrl+C` keeps its ordinary meaning in the tab and a double press never ends the tab's process. Inside the A1 tab, `/quit` and `Ctrl+D` on an empty editor SHALL request detach through the tab bridge for the attachment that was current when the command was admitted, and the server SHALL honor the request only while that attachment is still current. When the bridge is unavailable, the tab SHALL remain running and SHALL direct the user to `Ctrl+C` twice. Detaching SHALL restore the outer terminal's screen and input modes and leave the tab running, and the parent terminal SHALL show a dim `1 tab still running · run a1 to return`.

#### Scenario: Leave with Ctrl+C twice
- **WHEN** the user presses `Ctrl+C` twice within the clear/exit interval in the tab
- **THEN** the tab SHALL receive exactly one `Ctrl+C`, the client SHALL detach, and the tab's process SHALL keep running

#### Scenario: Single Ctrl+C keeps its meaning
- **WHEN** the user presses `Ctrl+C` once in the A1 tab
- **THEN** A1 in the tab SHALL clear or copy exactly as in single-agent A1 and the client SHALL remain attached

#### Scenario: Quit while the tab works
- **WHEN** the user submits `/quit` while the tab streams a reply
- **THEN** the terminal SHALL be restored with the running-tab hint and the tab SHALL finish its turn

#### Scenario: Enhanced keyboard modes do not leak
- **WHEN** the client detaches after enabling enhanced keyboard or mouse reporting
- **THEN** the parent shell SHALL receive no enhanced key or mouse sequences

### Requirement: Relaunching bare A1 reattaches every tab
Bare `a1` with resident tabs enabled SHALL connect to the profile's resident server and view the resident tab from its retained terminal surface. The surface SHALL include output produced while no client was attached, and input SHALL reach the tab as soon as the surface is shown.

#### Scenario: Close the terminal mid-turn and return
- **WHEN** the terminal running `a1` closes while the tab streams, and the user later runs `a1` in a new terminal
- **THEN** the tab SHALL show the output produced while detached and the live continuation of the turn, or its completed result

#### Scenario: Type after reattaching
- **WHEN** the user reattaches and types a prompt
- **THEN** the keystrokes SHALL reach the A1 editor in the tab encoded for its current terminal modes
