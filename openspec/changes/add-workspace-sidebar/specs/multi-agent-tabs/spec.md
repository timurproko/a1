## MODIFIED Requirements

### Requirement: Relaunching bare A1 reattaches every tab
Bare `a1` SHALL resolve the invoking folder's workspace before its first tab-bearing presentation and view that workspace's retained Agent collection. When several workspaces share that exact canonical folder it SHALL select its most recently selected workspace, not a profile-global collection or an implicit new workspace merely because another client is attached. A new folder SHALL receive its first workspace and Agent; an existing empty workspace SHALL retain its landing. Retained surfaces SHALL include output produced without a viewer, and input SHALL reach the selected Agent as soon as its current surface/controller admission completes. This workspace-scoped selection supersedes earlier profile-wide initial tab-selection and opt-in-era launch statements; solo, comparison, and ordinary fallback behavior remain unchanged.

#### Scenario: Close the terminal mid-turn and return
- **WHEN** a terminal closes while a workspace Agent streams and the user later launches A1 from that workspace's folder
- **THEN** the selected workspace SHALL show its retained current Agent output and live continuation or completed result without replaying terminal history

#### Scenario: Type after reattaching
- **WHEN** the user reattaches and types into a selected workspace Agent
- **THEN** the keystrokes SHALL reach that Agent's editor encoded for its current terminal modes and not an Agent in another workspace

#### Scenario: Another folder has running tabs
- **WHEN** A has running Agents and a client launches from distinct folder B
- **THEN** that client SHALL select or create B's workspace without briefly presenting A's Agent collection or changing A's viewers

### Requirement: Tabs are managed from the strip, mouse, and assignable actions
A1 SHALL create a new Agent tab in the selected workspace's root from `Alt+A`; clicking `+` SHALL act as the configured plus menu requires and by default SHALL create one Agent through the same creation flow. With no workspace selected, Agent creation SHALL first create a workspace in the client's last-selected folder or original launch folder. Switching workspaces SHALL NOT leave Agent creation bound to the original shell launch cwd. Settings SHALL create or show the singleton global Settings utility tab; its default `Alt+,` action SHALL do the same from another tab and SHALL hide Settings while viewed. `Alt+1` through `Alt+9` SHALL view those drawn positions and `Alt+0` the tenth within the current strip. Actions for next, previous, move-right, and move-left SHALL remain assignable without default keys. Left click SHALL view a tab. Right click on a visible Agent SHALL open the existing Close/Rename menu; Settings and Changelog SHALL expose Close but not Rename. Popup labels SHALL use effective shortcut assignments, and existing menu dismissal and drag-reorder rules SHALL remain unchanged. Agent strip order, rename, close-neighbor, and reorder targets SHALL be workspace-local, while utility processes/preferences remain global. No tab-management slash command, configured/hard user tab count, or `tab-limit` refusal SHALL be introduced. Every queued operation SHALL retain its admitted workspace/target and expected revision rather than follow a later client selection.

#### Scenario: Create from keyboard
- **WHEN** the user presses Alt+A
- **THEN** a new default-named Agent SHALL start in the selected workspace root and become viewed with its first complete surface

#### Scenario: Create from strip
- **WHEN** the user clicks plus under the default plus menu
- **THEN** the same workspace-local creation flow as Alt+A SHALL run without a popup

#### Scenario: Create from the grouped launcher
- **WHEN** the plus menu offers several kinds and the user selects Agent
- **THEN** the same workspace-local creation flow as Alt+A SHALL run

#### Scenario: Create after switching away from the launch folder
- **WHEN** a terminal launched in A selects workspace B and creates an Agent
- **THEN** the new Agent SHALL use B's folder and cwd-bound project resources without changing another Agent's cwd

#### Scenario: Open Settings from the grouped launcher
- **WHEN** the grouped plus menu offers Settings and the user selects it with or without Agent tabs
- **THEN** A1 SHALL create or activate the singleton global Settings tab without visible command input or workspace-owned Agent creation

#### Scenario: Open Settings from its action
- **WHEN** a client invokes the effective Settings action while viewing an Agent in any workspace
- **THEN** A1 SHALL show the same global singleton without creating a workspace-owned Settings session
- **AND** returning from Settings SHALL restore that client's current workspace Agent or landing

#### Scenario: Hover strip controls
- **WHEN** the pointer rests over a non-viewed chip, overflow, or plus control
- **THEN** its existing hover styling SHALL persist until the pointer leaves or geometry disappears
- **AND** unrelated workspace activity, clock, registry, or child updates SHALL NOT clear it

#### Scenario: Open and use the default context menu
- **WHEN** the user right-clicks a visible Agent chip under default bindings
- **THEN** the existing Close then Rename menu SHALL invoke the pointed action once for that original workspace Agent

#### Scenario: Cancel the context menu
- **WHEN** the user presses Escape or clicks outside an open Agent menu
- **THEN** the menu SHALL close without child input or action and the latest complete child surface SHALL remain visible

#### Scenario: Jump beyond count
- **WHEN** a current strip has three drawn chips and the user presses Alt+7
- **THEN** view SHALL remain unchanged and the key SHALL not reach a child or an Agent in another workspace

#### Scenario: Preview and commit a drag reorder
- **WHEN** the user holds an Agent chip for the existing threshold or crosses its midpoint and releases on the strip
- **THEN** the existing insertion marker and one expected-revision reorder SHALL apply only inside that Agent's workspace
- **AND** release away from the strip SHALL cancel without moving another workspace's tabs

#### Scenario: Concurrent reorder
- **WHEN** two clients reorder the same workspace from one registry revision
- **THEN** exactly one change SHALL apply and both clients SHALL converge without changing another workspace's order

#### Scenario: A queued close crosses workspace selection
- **WHEN** a close was admitted for A's Agent before the originating client selects B
- **THEN** it SHALL either close that original valid A Agent or be refused and SHALL NOT close B's selected Agent

#### Scenario: Tab limit reached
- **WHEN** total tab count exceeds historical configured/hard quotas but the new workspace-local start can acquire real resources
- **THEN** creation SHALL proceed without a tab-count refusal

#### Scenario: Create beyond the former limit
- **WHEN** sequential Agent creation exceeds historical tabsMax/hard-count values but acquires every real required resource
- **THEN** A1 SHALL continue without a configured count quota, quota notice, or silent recycling

#### Scenario: Real start failure
- **WHEN** an Agent cannot start or its required durable registry commit fails
- **THEN** no Agent SHALL be claimed as created and concise feedback SHALL name the concrete failure without mentioning a tab limit

### Requirement: The active terminal automatically controls its viewed tab
Each Agent tab SHALL have at most one input-controller client and monotonic revision. Transfer SHALL retain the existing proven native/PTY/child ordering barrier. Focus gain SHALL automatically claim the viewed tab; without a completed focus claim the first input SHALL be held until acknowledgement. No Enter takeover or persistent view-only prompt SHALL be required. Input and resize SHALL carry current authority; stale clients SHALL deliver no bytes. Each client SHALL own its selected workspace and viewed tab per workspace, and a workspace selection SHALL NOT evict or switch another client. Queued actions and quit requests SHALL retain immutable originating workspace, client, view generation, and controller revision captured at admission. `/quit` and empty-editor Ctrl+D SHALL detach only their still-current originating attach; ambiguous attribution SHALL be rejected and direct the user to double Ctrl+C. Detach SHALL leave every workspace's Agents running and report the existing running-Agent hint. Terminal bytes and prompt content SHALL NOT enter the bridge.

#### Scenario: Second terminal becomes active
- **WHEN** a second terminal gains focus on the same controlled Agent
- **THEN** the existing causal boundary and new owner SHALL be acknowledged before its input is delivered

#### Scenario: Focus reporting is unavailable
- **WHEN** first input arrives without a completed focus claim
- **THEN** it SHALL be held and delivered once after safe claim completion

#### Scenario: Stale detach request
- **WHEN** a detach request names a superseded controller revision or workspace/view generation
- **THEN** no attach client SHALL detach

#### Scenario: Delayed quit from previous controller
- **WHEN** A's admitted quit executes after another client gains control or the originating client switches workspace
- **THEN** the request SHALL retain its original authority or be rejected and SHALL detach neither a superseding client nor the newly selected workspace's view

#### Scenario: Two terminals view different workspaces
- **WHEN** two terminals select A and B inside the same resident host
- **THEN** both SHALL see the shared workspace sidebar while each strip/body contains only its own selected workspace Agents plus existing global utilities
- **AND** selecting A in one terminal SHALL NOT switch the other terminal from B

#### Scenario: Two terminals view different tabs
- **WHEN** both terminals explicitly select the same workspace
- **THEN** they SHALL see its shared Agent collection but retain independent viewed tabs and existing per-tab controller revisions

#### Scenario: Quit local A1 attach
- **WHEN** the current controller quits while Agents run in several workspaces
- **THEN** only that attach SHALL exit and every Agent and other attach SHALL continue under the existing resident lifecycle
