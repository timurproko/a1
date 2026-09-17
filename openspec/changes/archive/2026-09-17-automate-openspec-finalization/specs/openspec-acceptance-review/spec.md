## MODIFIED Requirements

### Requirement: Candidate validation separates objective evidence from human acceptance
Before manual merge, trusted policy SHALL verify the complete final diff, versioned association, finalized archive identity, conditional manifest, canonical-spec synchronization, artifacts, task state, evidence references, known-gap dispositions, exact-head required checks, target baseline, and PR-body scenario membership. Candidate validation SHALL report missing, stale, failed, conflicting, or ambiguous inputs as blockers. It SHALL NOT claim that listed human scenarios were performed or passed. For a non-draft head that still holds the active change, it SHALL report `needs-finalization` with trusted finalization automation as the next action rather than a bare failure code.

A new head, changed acceptance manifest, changed acceptance list, changed target baseline, or changed required-check result SHALL invalidate prior candidate validation. Body edits and synchronize events SHALL trigger re-evaluation for the current head, including the head and body that trusted finalization automation publishes. Required branch protection and ordinary product validation SHALL remain the integration gate.

#### Scenario: Objective evidence is incomplete
- **WHEN** required implementation, test, synchronization, task, or known-gap evidence is missing or contradictory
- **THEN** trusted candidate validation SHALL fail
- **AND** manual scenario wording SHALL NOT override the blocker

#### Scenario: Head changes
- **WHEN** a commit is added after a candidate validation result
- **THEN** the prior result SHALL be stale
- **AND** the new head SHALL require complete current-head validation before merge

#### Scenario: Automation publishes the finalized head
- **WHEN** trusted finalization automation pushes the finalization commit and updates the body fence
- **THEN** candidate validation SHALL evaluate that head and body as an ordinary new candidate
- **AND** SHALL report it ready for maintainer review only when every machine-verifiable requirement passes

#### Scenario: Candidate is valid but unmerged
- **WHEN** every machine-verifiable requirement passes for the exact current head
- **THEN** status SHALL report the candidate ready for maintainer review
- **AND** SHALL NOT report accepted or archived integration before manual merge
