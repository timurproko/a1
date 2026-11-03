## ADDED Requirements

### Requirement: Attach presentation hides only a satisfied immutable-predecessor restart instruction
When the launching resident attach client has bounded durable proof that its immutable package version exactly equals the successfully installed automatic-update target, it SHALL suppress the exact visible phrase `Update installed, restart to update` from a compatible predecessor's complete structured surface. The projection SHALL replace only the matching phrase cells with equivalent-width blank cells and SHALL preserve surface geometry, neighboring cells, styles outside the match, cursor, terminal modes, topology/view sequencing, copy feedback, blocked-update status, working state, transcript content and child execution. Missing, malformed, oversized, blocked, failed, running, mismatched or unreadable proof, a nonexact phrase, multiple ambiguous matches, or an unstructured surface SHALL leave the child surface unchanged. The client SHALL NOT inject input or output, rewrite predecessor state, stop/restart a process, or generalize this adapter into arbitrary terminal-content filtering.

#### Scenario: Current client reconnects to an immutable predecessor
- **WHEN** durable installed state names the exact launching-client version and a retained predecessor publishes one exact structured restart-ready phrase
- **THEN** attach SHALL present the same surface without that phrase
- **AND** the predecessor Agent, holder, child, session and writer identities SHALL remain unchanged

#### Scenario: Restart is not proven satisfied
- **WHEN** installed state is absent, malformed, not installed, or names a version different from the launching client
- **THEN** attach SHALL leave the predecessor surface unchanged

#### Scenario: Another status occupies the acknowledgement line
- **WHEN** the structured row contains copy feedback, prepared-blocked status, Working state, a wording variation, or neighboring content rather than one exact restart-ready phrase
- **THEN** attach SHALL preserve that row exactly

#### Scenario: Only raw legacy bytes are available
- **WHEN** an admitted predecessor provides no complete structured surface
- **THEN** attach SHALL preserve its raw fallback presentation and SHALL NOT search or rewrite the byte stream
