## ADDED Requirements

### Requirement: Worktree claims are keyed by agent within a runtime
A live-session editing claim SHALL be identified by the owning runtime and the agent within that runtime. Activating a repository context for one agent SHALL release only that agent's prior claim, never a sibling agent's claim in the same runtime. Releasing a runtime SHALL release every agent claim it holds. The claim mutation lock SHALL record its holder's process identity and SHALL be evicted only when the holder is proven dead; a live or unverifiable holder SHALL keep the lock until the existing wait bound expires.

#### Scenario: Two agents in one runtime claim different worktrees
- **WHEN** agent B activates a worktree while agent A of the same runtime holds a claim on another
- **THEN** both claims SHALL remain and the inventory SHALL list both agents

#### Scenario: A claim record from a single-agent release is read
- **WHEN** a claim or runtime record without an agent id is read
- **THEN** it SHALL be treated as the primary agent's record and rewritten with the current format on its next write

#### Scenario: The lock holder crashed
- **WHEN** a mutation finds the lock held by a process that is proven dead by identity and start time
- **THEN** the lock SHALL be replaced atomically and the mutation SHALL proceed
