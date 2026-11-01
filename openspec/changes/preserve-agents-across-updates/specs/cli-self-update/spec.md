## ADDED Requirements

### Requirement: Post-update relaunch preserves access to resident Agents
After automatic or explicit activation, an ordinary bare-A1 relaunch in the same OS login session SHALL use the selected release's workspace and restore the canonical profile's previously open resident Agents through durable workspace continuity. Activation SHALL NOT kill working Agents, and relaunch SHALL NOT treat the selected release's initially empty local registry as proof that no Agents exist. Supported source Agents SHALL remain live and controllable until safe migration, and new Agents SHALL execute the selected release. Unsupported or unverifiable restoration SHALL retain visible recovery entries and actionable reasons rather than report successful empty restoration. Relaunch SHALL NOT require state deletion, manual process discovery, closing every Agent, or a machine restart. This requirement SHALL NOT authorize execution of obsolete private-launch contracts or absorption of direct solo/external writers.

#### Scenario: User follows the automatic-update restart instruction
- **WHEN** three A Agents are open, B activates, the user detaches or closes the outer terminal and then runs bare A1
- **THEN** the B workspace SHALL show those three Agents with their identities, names, order, selection and access preserved
- **AND** any working A Agent SHALL continue its turn while safely eligible Agents migrate to B

#### Scenario: Update was explicit
- **WHEN** a user explicitly installs B while A Agents remain open and then relaunches bare A1
- **THEN** the same workspace-continuity and safe-handoff behavior SHALL apply without changing explicit update progress or diagnostics

#### Scenario: Candidate has no release-local tabs yet
- **WHEN** B's local registry is empty but the profile has live supported Agents on retained release A
- **THEN** B SHALL restore those Agents instead of presenting an unrelated empty workspace or attempting second writers for their sessions

#### Scenario: Restoration is blocked
- **WHEN** a recorded source cannot be verified or reconnected
- **THEN** relaunch SHALL retain an identifiable recovery entry and a bounded reason without deleting source state, terminating unverified processes or claiming the Agent upgraded

#### Scenario: No existing resident Agents
- **WHEN** no open workspace Agents or recoverable source records exist
- **THEN** ordinary launch SHALL retain its existing fresh-workspace behavior without inventing prior sessions
