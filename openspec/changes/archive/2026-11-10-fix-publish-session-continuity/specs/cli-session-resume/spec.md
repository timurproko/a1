## ADDED Requirements

### Requirement: Session writer lifetime is fenced
A1 SHALL retain exclusive writer ownership while its owning process is live or unverifiable, regardless of heartbeat age. A stale claim SHALL be reclaimed only after the owner is proven absent; malformed legacy claims SHALL remain protected when absence cannot be established. Lost ownership SHALL fence further writing. Runtime construction failure and disposal SHALL release held writers exactly once through the integration owner.

#### Scenario: Writer stalls
- **WHEN** a live writer stops refreshing its heartbeat beyond the stale interval
- **THEN** a second process SHALL remain unable to acquire its session
- **AND** the original writer SHALL not continue unfenced after any loss of ownership

#### Scenario: Runtime initialization fails or disposal completes
- **WHEN** a writer has been acquired and initialization fails or the adapter disposes its runtime
- **THEN** ownership SHALL be released without depending on process exit

#### Scenario: Dead writer is recovered
- **WHEN** the recorded writer process is proven absent
- **THEN** a later open MAY reclaim the session without deleting or rewriting its conversation

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
