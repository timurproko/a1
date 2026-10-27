## MODIFIED Requirements

### Requirement: Normal A1 accepts explicit session selection
Stable and prerelease builds SHALL support `a1 --session <path|id>` with optional `--session-dir <dir>` before or after `--session`. Each SHALL occur at most once and require a nonempty value. Missing/empty/duplicate options, --session-dir alone, unknown trailing options, and extra positional arguments SHALL fail with a focused nonzero diagnostic before supervisor or interactive startup. Help SHALL list the supported forms and argument-free `a1 solo`. Bare resident `a1` SHALL select the workspace matching its exact canonical launch folder according to the workspace future-launch preference, creating its first workspace/Agent only when that folder has none and preserving existing empty-workspace landing. A session launch SHALL focus a live matching-release Agent and its owning workspace in the launching client only, or open an unheld resolved session as an Agent in a workspace matching its effective resumed cwd. Existing relative-path, ID discovery, explicit cross-project fork, persisted-session, project-trust, and session-directory semantics SHALL remain unchanged. Solo SHALL start fresh without resident infrastructure and reject extra arguments. Shared canonical session-writer locks SHALL remain authoritative in resident and direct/fallback routes; a writer in another workspace/release SHALL remain a conflict or existing explicit fork choice, never an implicit copy, takeover, cross-release attach, or second writer. Direct lease checks SHALL NOT initialize a host.

#### Scenario: Select an existing session by ID
- **WHEN** the user supplies a supported saved-session ID
- **THEN** A1 SHALL perform the existing interactive resolution and launch rather than return a silent successful no-op

#### Scenario: Supply a custom directory in either order
- **WHEN** one valid session selector and custom session directory are supplied in either order
- **THEN** both invocations SHALL resolve the same target and effective session store without using workspace metadata as replacement discovery authority

#### Scenario: Malformed session launch
- **WHEN** recognized session grammar has a missing/empty value, duplicate option, unknown option, extra positional argument, or no session target
- **THEN** A1 SHALL exit nonzero with a concise diagnostic and start no supervisor or interactive runtime

#### Scenario: Inspect help without launching
- **WHEN** the user requests help
- **THEN** supported session/solo forms SHALL be listed without interactive startup

#### Scenario: Explicit solo launch
- **WHEN** the user runs argument-free a1 solo
- **THEN** A1 SHALL start a fresh direct runtime without workspace/sidebar/host discovery

#### Scenario: Solo launch rejects extra arguments
- **WHEN** the user supplies arguments after solo
- **THEN** A1 SHALL report a syntax error and start no runtime

#### Scenario: Bare launch with resident tabs running
- **WHEN** the invoking folder's selected workspace has two running resident tabs and the user runs bare a1
- **THEN** A1 SHALL show those existing tabs without creating a third or including another workspace's Agents

#### Scenario: Bare launch with resident Agents in another folder
- **WHEN** workspace A has running Agents and the user launches from distinct folder B
- **THEN** A1 SHALL select or create B's workspace rather than show A's collection or redirect A's clients

#### Scenario: Bare launch in an existing empty workspace folder
- **WHEN** the matching workspace has no Agent tabs
- **THEN** A1 SHALL preserve its landing instead of silently creating an Agent

#### Scenario: Session launch with resident tabs running
- **WHEN** the normal validated session resolution succeeds and no participating writer owns the target
- **THEN** A1 SHALL open it under the existing writer lease in a workspace matching its effective resumed cwd
- **AND** no silent cwd substitution, extra fork, source modification, or automatic model prompt SHALL occur

#### Scenario: Session launch names a held session
- **WHEN** the selected session is held by a live Agent in workspace B while the invoking folder matches A
- **THEN** only the launching client SHALL select B and its existing Agent without a new writer
- **AND** other attached clients SHALL retain their own selections

#### Scenario: Another release or a direct session holds the target
- **WHEN** the selected session has a participating writer outside this release's live Agent registry
- **THEN** A1 SHALL preserve current conflict-safe refusal or explicit fork semantics without adopting another host or opening a second writer

#### Scenario: Direct launch selects a held session
- **WHEN** a direct launch selects a session held by another participating writer
- **THEN** A1 SHALL fail safely or offer its existing explicit fork choice without attaching or overwriting

#### Scenario: Direct fallback selects a held session
- **WHEN** direct fallback resolves a session held by a resident Agent
- **THEN** it SHALL report the conflict or offer an existing explicit fork without altering resident workspace/session state
