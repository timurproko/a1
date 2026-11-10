## ADDED Requirements

### Requirement: Large supported histories resume without delivery overflow
A1 SHALL restore an existing supported same-pin session whose authoritative UI transcript exceeds 8 MiB without treating accumulated history as pending-event saturation. The public installed entry SHALL reach input readiness with the persisted identity and active context, preserve source bytes absent new user work, and introduce no context loss relative to direct same-pin reopening. Regression fixtures SHALL be isolated synthetic sessions persisted with the pinned public APIs, not personal conversation copies.

#### Scenario: Resume a large uncompacted session
- **WHEN** the ordinary exit hint selects a supported uncompacted session with a projected transcript larger than 8 MiB
- **THEN** the public entry SHALL restore its identity and conversation before accepting another prompt without an engine-delivery failure
- **AND** independent early and late markers and direct same-pin context SHALL agree without truncating or rewriting the session

#### Scenario: Resume a large compacted session
- **WHEN** a supported compacted same-pin session still projects more than 8 MiB of active transcript
- **THEN** its emitted resume command SHALL restore the same active checkpoint context and later messages as direct reopening
- **AND** no automatic model request or forced compaction SHALL be required to reach input readiness
