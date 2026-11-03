## ADDED Requirements

### Requirement: Update activation preserves a usable control path to live Agents
Automatic and explicit update SHALL verify that the candidate client can reconnect to every affected supported live profile runtime through its required authenticated control contract before committing client activation or announcing successful/restart-ready activation. Mandatory compatibility SHALL include live view, input, current controller/interaction semantics and source identity, not merely matching version/generation. The verdict SHALL be fenced/revalidated against concurrent workspace/runtime changes. If compatibility cannot be established, candidate preparation SHALL NOT become active client selection, a verified eligible prior client SHALL remain callable through the launcher, and live execution/data SHALL remain untouched. Candidate staging SHALL NOT be reported as a completed/restart-ready update. No update SHALL require idle waits, Agent closure, state deletion, machine restart or manual session reconstruction to preserve ordinary resident access. Obsolete private-launch contracts SHALL remain ineligible.

#### Scenario: Default background update is compatible
- **WHEN** Auto prepares a candidate compatible with every affected live runtime
- **THEN** it MAY activate the updated client and announce restart readiness while all busy and idle Agents keep running unchanged

#### Scenario: Candidate cannot control a live source
- **WHEN** required source view/input/interaction semantics are unsupported or cannot be verified
- **THEN** update SHALL leave the verified usable prior client active and callable and SHALL NOT announce restart readiness or terminate, hide or replace Agents

#### Scenario: Workspace changes during readiness inspection
- **WHEN** a new runtime or changed source/controller contract invalidates the inspected workspace before activation commits
- **THEN** activation SHALL revalidate or refuse rather than commit a stale continuity verdict

### Requirement: Post-update relaunch reconnects the same live workspace
After a compatible automatic or explicit update in the same OS login session, ordinary bare A1 SHALL launch the updated client and reconnect the canonical profile's same live resident Agents. Busy and idle Agent/holder/tool processes SHALL retain their identities, work, session authority, input state and outstanding interactions. Relaunch SHALL NOT stop/restart/suspend them, wait for idle, reopen their transcripts as replacement Agents, replay work or trigger a later idle restart. The selected release's initially empty local registry SHALL NOT imply the profile workspace is empty. Existing source custody SHALL remain intact while new Agents use the selected release. An inaccessible tab/recovery tile or per-session resume instruction SHALL NOT count as successful seamless restoration. Closing the multitab client SHALL remain detach, not Agent exit, with the same live-access expectation before and after update. Solo SHALL retain its existing explicit exit/resume-message behavior; solo/external writer adoption and reboot/logout restoration remain outside this resident reconnect contract.

#### Scenario: User follows the default automatic-update restart instruction
- **WHEN** two A Agents work and one is idle, B compatibly activates, and the user closes the terminal and reopens A1
- **THEN** the updated client SHALL show those same three Agents with their names/order/selection and immediate ordinary view/input/interaction access
- **AND** holder, Agent and tool identities SHALL remain unchanged and work performed while detached SHALL be visible

#### Scenario: Agents become idle after reconnect
- **WHEN** the two previously working Agents finish in the updated workspace
- **THEN** all three SHALL remain the same live processes without deferred upgrade restarts

#### Scenario: Update was explicit
- **WHEN** a compatible explicit update activates while resident Agents remain open
- **THEN** the same live-workspace continuity SHALL apply without weakening explicit progress or diagnostic behavior

#### Scenario: No resident workspace exists
- **WHEN** no open or recoverable workspace/source records exist
- **THEN** ordinary launch SHALL retain its normal fresh-workspace behavior without inventing prior sessions
