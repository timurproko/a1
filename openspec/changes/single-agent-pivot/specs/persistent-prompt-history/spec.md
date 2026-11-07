## ADDED Requirements

### Requirement: Durable history can be isolated per agent session
Unique mode SHALL keep separate durable prompt history and image sidecars for each stable agent session within a profile, including agents running concurrently in distinct `a1` processes. Shared mode SHALL continue to use the existing profile-wide database and sidecars for all agent sessions in that profile. Switching scope SHALL NOT transfer, import, merge, delete, or silently read records from the other scope. Both modes SHALL preserve the existing per-store limits, failure behavior, and transcript-based/session-local recall.

#### Scenario: Two agents run concurrently with Unique history
- **WHEN** two new `a1` sessions share a profile and history root with Unique selected
- **THEN** each SHALL recall only its own committed durable prompts, plus its own existing local and transcript fallback
- **AND** neither SHALL modify the other's database or image sidecars

#### Scenario: Concurrent agents share one scope setting
- **WHEN** two new `a1` processes run under the same profile with Unique selected
- **THEN** each SHALL read and write a different durable history while sharing the same global scope setting

#### Scenario: Resume or fork an agent session
- **WHEN** the same agent session ID is resumed after a process restart in Unique mode
- **THEN** its prior committed prompts and image sidecars SHALL be available again
- **AND** a new session or fork with another ID SHALL NOT inherit that durable store

#### Scenario: Preserve the existing shared store
- **WHEN** Shared is selected on a profile with an existing profile-wide history database
- **THEN** concurrent sessions SHALL see the same committed prompts using the same existing database and image-sidecar locations
- **AND** no data migration or schema rewrite SHALL be required

#### Scenario: Propagate a new shared prompt
- **WHEN** two agents with distinct Unique stores switch to Shared and the first submits a new prompt after observing the change
- **THEN** that prompt SHALL be written to the existing profile-wide database and appear in the second agent's next shared-history refresh
- **AND** the old Unique prompts SHALL remain only in their respective per-session databases

#### Scenario: Keep submitted work in its original scope
- **WHEN** a submission was captured for a store before its agent observed a scope change
- **THEN** the pending write SHALL finish in its original store, not the newly selected one
- **AND** subsequent submissions SHALL be recorded only in the new store

#### Scenario: Change scope in either direction
- **WHEN** the saved scope changes between Unique and Shared
- **THEN** new and running agents SHALL use only the newly selected store after observing the change
- **AND** the other scope's data SHALL remain intact without appearing in the newly selected store
- **AND** unsent drafts SHALL remain intact while each agent's visible recall switches to the selected store

## REMOVED Requirements

### Requirement: Durable history can be isolated by agent session
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Durable history can be isolated per agent session".
