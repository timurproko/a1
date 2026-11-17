## ADDED Requirements

### Requirement: External per-session automatic naming control

Protocol 1 SHALL expose a boolean sessionAutoName setting through settings.list, settings.get and settings.update for exact session/runtime targets. Descriptor labels and descriptions SHALL derive from the existing application-owned setting. Updates SHALL accept only JSON booleans and SHALL acknowledge status applied only after the owning naming service durably persists the session override. Readback SHALL include the exact target, setting, nullable boolean storedValue, boolean effectiveValue, origin and live application metadata. Before an override exists, storedValue SHALL be null and effectiveValue SHALL follow the existing profile policy; after an update, the session override SHALL win over profile changes and survive resume. Requests SHALL retain existing binding, deadline and serialization fencing, SHALL NOT select an implicit session, and SHALL NOT expose paths or private transport metadata. Existing color settings and session.rename SHALL remain supported unchanged.

#### Scenario: Inherit before an external override
- **WHEN** a client reads sessionAutoName for a persistent session without an override
- **THEN** storedValue is null and effectiveValue reflects the profile automatic-naming policy with an inherited origin
- **AND** no session or profile state changes

#### Scenario: Disable automatic naming and assign a name
- **WHEN** a client updates sessionAutoName to false and then submits a valid revision-guarded session.rename
- **THEN** automatic naming is disabled for only that session and the manual name persists through the existing naming owner
- **AND** the profile and other sessions remain unchanged

#### Scenario: Preserve an override across resume
- **WHEN** a session with a persisted automatic-naming override is resumed
- **THEN** its effective policy uses that override even if the profile policy changed
- **AND** replacement sessions do not inherit the previous session's override

#### Scenario: Reject invalid toggle values
- **WHEN** a client supplies a string, number, null or unsupported scope for a sessionAutoName update
- **THEN** the API returns the existing structured validation error without changing any setting

#### Scenario: Idempotent durable acknowledgement
- **WHEN** a client repeats the same boolean update for the exact current session
- **THEN** the API acknowledges the same stored and effective values without duplicating durable policy history
- **AND** an unavailable or nonpersistent session fails rather than claiming durable application

### Requirement: Automatic-name policy changes preserve names and fence pending work

Disabling a session's effective automatic-naming policy SHALL cancel pending generation and prevent late completion from changing its name. The existing current name and naming provenance SHALL remain intact. Enabling SHALL only permit future ordinarily eligible naming on a user prompt; it SHALL NOT rename immediately, clear manual ownership or force regeneration of an already-completed context. External manual renames SHALL continue to be preserved regardless of this policy. Native A1-to-Herdr name reporting SHALL remain unchanged.

#### Scenario: Disable while generation is pending
- **WHEN** an external update disables automatic naming before a pending completion is applied
- **THEN** the pending work is cancelled and a late provider response cannot overwrite the current name

#### Scenario: Re-enable without overwriting a manual name
- **WHEN** a client enables automatic naming for a manually named session
- **THEN** the name remains unchanged immediately and on later prompts under the existing manual-ownership rule

#### Scenario: Re-enable an eligible unnamed session
- **WHEN** a client enables automatic naming for an eligible unnamed session and a later user prompt starts a run
- **THEN** the ordinary automatic-naming policy may name it without a separate external rename request
