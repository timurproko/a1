## MODIFIED Requirements

### Requirement: Run completion preserves the active transcript continuously
Every displayable semantic user, assistant, thinking, and tool surface in the active transcript SHALL remain available in its established order through message completion, run completion, settlement, and presentation coalescing. A completion event carrying only the messages generated in that run SHALL NOT be interpreted as a replacement for the complete session history, even temporarily. Reconciliation SHALL use the pinned session-authoritative scope appropriate to the operation and SHALL preserve unchanged surface identities. That reconciliation, together with block identity, revision numbering, tool lifecycle settlement, and image asset retention, SHALL be one transcript projection owned by the engine adapter and testable without the adapter: it SHALL receive the session-authoritative messages and the retry attempt it needs as inputs and SHALL report each stored block change through a port, while the adapter alone decides when pending delivery snapshots are sealed and when a change is delivered.

This requirement SHALL preserve existing visibility, expansion, branch, compaction, navigation, and explicit session-replacement policies. It SHALL NOT require retaining every superseded partial snapshot or rendering off-screen or deliberately hidden content. Actual authoritative removal or session replacement SHALL remain distinguishable from ordinary run completion.

#### Scenario: Finish a later run in an existing conversation
- **WHEN** earlier user and assistant messages exist and a later run ends with a run-local message collection
- **THEN** every presented intermediate and settled transcript state SHALL retain the earlier messages and all displayable messages of the later run
- **AND** no later settlement event SHALL be needed to restore missing earlier surfaces

#### Scenario: Delay settlement after run completion
- **WHEN** settlement follows run completion after an asynchronous operation or additional event-loop turns
- **THEN** the transcript SHALL remain complete throughout that interval
- **AND** the reader SHALL be able to scroll to and copy earlier retained content

#### Scenario: Complete mixed assistant content
- **WHEN** an assistant emits consecutive or interleaved text, thinking, code, and tool-call content and completes
- **THEN** all displayable parts SHALL retain their source order and pinned content boundaries
- **AND** starting a subsequent message SHALL NOT remove completed commentary or thinking surfaces

#### Scenario: Replace the authoritative session scope
- **WHEN** explicit session or branch replacement, or the existing compaction policy, supplies a legitimately different authoritative transcript
- **THEN** the shell SHALL reconcile that scope according to its existing contract
- **AND** obsolete generation events SHALL NOT repopulate removed content or mutate the replacement session

#### Scenario: Project a transcript without an engine
- **WHEN** the projection is driven directly with session messages, tool execution events, and declaration failures
- **THEN** it SHALL produce the same block identities, revisions, and settlement outcomes the shell observes through the adapter
- **AND** a block that repeats itself SHALL neither change revision nor be reported
