## MODIFIED Requirements

### Requirement: The tab registry is durable and lease-protected
The server SHALL write only its canonical-profile and immutable-release registry while holding that namespace's owner-only OS-exclusive registry-writer lease and current durable epoch. Every mutation SHALL recheck authority and commit through durable atomic replacement before acknowledgment. The registry SHALL record its release namespace, workspace IDs/roots/labels/order/future-launch preference and closing intent, and each Agent tab's workspace membership, identity, kind, display name/name source, order, cwd, session location, desired state, lifecycle, incarnation, verified holder identity/release, last exit, registry revision, epoch and boot identity. Client-local workspace/view selection SHALL NOT become a shared active-workspace default. Global utility tabs SHALL remain outside Agent workspace ownership. The registry SHALL NOT contain credentials, environment values, prompt text or terminal content. A failed write SHALL NOT be acknowledged or stop a running tab. Other-release and legacy unversioned registries/owner markers SHALL NOT be adopted, overwritten or removed. Supported pre-workspace records inside this namespace SHALL preserve one legacy collection rather than redistribute live Agents by inferred folder.

#### Scenario: Server killed right after a tab is created
- **WHEN** tab creation, workspace membership, closing intent, or removal is acknowledged and the matching server is killed
- **THEN** replacement SHALL recover that committed workspace/tab relationship only from the matching namespace
- **AND** it SHALL preserve verified holder/child identity and SHALL NOT restart an intentionally closing Agent

#### Scenario: Server without the writer lease
- **WHEN** a server lacks its namespace's writer lease or current epoch
- **THEN** it SHALL reject mutation without writing or acknowledging success

#### Scenario: Registry contents stay non-secret
- **WHEN** the registry is read after workspace selection, Agent execution, and reattachment
- **THEN** it SHALL contain no token, derived credential, environment value, prompt text, terminal content, or globally authoritative client selection

#### Scenario: Two release authorities coexist
- **WHEN** two releases serve the same profile with workspaces
- **THEN** each SHALL retain its independent registry lease/epoch and SHALL gain no authority over another release's workspaces or roles

#### Scenario: Existing ungrouped records are encountered
- **WHEN** this release supports reading its pre-workspace registry shape
- **THEN** it SHALL preserve the full Agent collection as one legacy workspace without guessed per-cwd redistribution or changing session files

### Requirement: Resident tabs fit current controller geometry before presentation
Whenever an authoritative attach controller reports new terminal geometry, A1 SHALL route it to the selected holder and pre-fit hidden, unclaimed Agent holders only inside that client's selected workspace. It SHALL exclude Agents in other workspaces, global utility geometry not controlled by that client, and tabs viewed or controlled elsewhere. A view request SHALL carry current terminal geometry; after granting controller authority the server SHALL queue target resize before enabling its fresh surface publication. This SHALL include workspace switches, hidden-tab activation, and direct attachment to an existing Agent. The child SHALL publish a complete current-geometry surface without another user/model event, and the outer UI SHALL NOT commit an old-geometry intermediate surface. A spectator SHALL NOT resize a shared child. Opening/closing the overlay sidebar SHALL NOT change child geometry or trigger a resize curtain.

#### Scenario: Hidden tabs reflow during authoritative resize
- **WHEN** a terminal changes size while its client controls an Agent in workspace A
- **THEN** the selected holder and hidden/unclaimed Agents in A SHALL be fitted to its geometry without enabling their external body delivery
- **AND** no holder in workspace B or viewed/controlled by another client SHALL be resized by this background fitting

#### Scenario: Switch to a pre-fitted hidden tab
- **WHEN** a user switches to an Agent hidden during that workspace's latest authoritative resize
- **THEN** its first fresh replacement surface SHALL use current controller dimensions without an old-size intermediate frame

#### Scenario: Activation repairs a missed background resize
- **WHEN** a client selects an Agent in another workspace whose retained geometry differs
- **THEN** its view request SHALL carry current controller geometry and the target resize SHALL precede fresh surface subscription
- **AND** Agents it did not select in another client's workspace SHALL remain unchanged

#### Scenario: Reattach at a different size
- **WHEN** an attach opens an existing Agent from a differently sized terminal
- **THEN** controller activation SHALL fit the holder before committing its fresh surface

#### Scenario: Differently sized spectator and active tabs remain isolated
- **WHEN** a read-only client views the same Agent from different terminal dimensions
- **THEN** it SHALL fit the controller-sized presentation without resizing the shared child or initiating a controller claim merely because of resize

#### Scenario: Toggle workspace overlay
- **WHEN** a user opens or closes the sidebar without changing outer terminal dimensions
- **THEN** the retained child dimensions SHALL stay unchanged and no Agent SHALL receive a sidebar-induced resize
- **AND** normal complete-surface cursor/mouse/selection semantics SHALL remain intact
