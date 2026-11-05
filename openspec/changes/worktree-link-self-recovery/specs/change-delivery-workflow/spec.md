## MODIFIED Requirements

### Requirement: Worktree claims are keyed by agent within a runtime

A live-session editing claim SHALL be identified by the owning runtime and the agent within that runtime. Activating a repository context for one agent SHALL release only that agent's prior claim, never a sibling agent's claim in the same runtime. Releasing a runtime SHALL release every agent claim it holds. Mutation coordination SHALL preserve exclusive access independently of diagnostic metadata parsing in the recovery-capable protocol. Legacy mutation holders and live editing claims SHALL retain exact-process ownership checks: a live or unverifiable holder SHALL NOT be displaced by age, inactivity, or malformed metadata. Safe recovery of mutation coordination SHALL NOT itself transfer a worktree editing claim.

#### Scenario: Two agents in one runtime claim different worktrees

- **WHEN** agent B activates a worktree while agent A of the same runtime holds a claim on another
- **THEN** both claims SHALL remain and the inventory SHALL list both agents

#### Scenario: A claim record from a single-agent release is read

- **WHEN** a claim or runtime record without an agent id is read
- **THEN** it SHALL be treated as the primary agent's record and rewritten with the current format on its next write

#### Scenario: The lock holder crashed

- **WHEN** a mutation establishes that the recorded legacy holder is dead by exact process identity, or obtains crash-released authority under the recovery-capable protocol with compatibility checks satisfied
- **THEN** it SHALL safely retire only the abandoned mutation artifact and proceed under exclusive authority
- **AND** ordinary editing-claim ownership checks SHALL still apply

#### Scenario: Mutation recovery encounters a live editing owner

- **GIVEN** the mutation gate has safely recovered but another live runtime still claims the requested worktree
- **WHEN** a session attempts to link that worktree
- **THEN** linking SHALL fail with the existing active-owner result
- **AND** recovery SHALL NOT change that owner's claim or association
