## MODIFIED Requirements

### Requirement: Agents own progress while automation owns readiness

The detailed task ledger SHALL hold one task group per approved `Implementation` item, in the same order. While a pull request remains draft, the agent SHALL deliver one item at a time: write that outcome's code and tests, complete its detailed task bookkeeping, commit and push, and then check that item before starting the next outcome. The agent SHALL NOT hold completed items back for handoff. A defect found after an item is checked SHALL be fixed in a later commit; CI, broad test runs, and manual validation SHALL NOT delay a check. Before checking the final item, the agent SHALL add plain `Acceptance`, finish every pre-ready task and gap disposition, and reconcile and push the branch. The final checkbox update SHALL complete the agent-owned implementation job; the agent SHALL NOT invoke the ready mutation.

#### Scenario: One implementation outcome finishes

- **WHEN** an agent writes one approved outcome's code and tests and completes its detailed task bookkeeping
- **THEN** the agent SHALL commit and push that outcome and update only that PR-body item's marker while the pull request remains draft
- **AND** other incomplete implementation outcomes SHALL remain unchecked

#### Scenario: Several outcomes are approved

- **WHEN** an approved plan has more than one Implementation item
- **THEN** each item SHALL be checked after its own pushed commit and before work on the next item starts
- **AND** the items SHALL NOT all be checked together at handoff

#### Scenario: Root guidance carries the rule

- **WHEN** an agent of any runtime loads the repository's root instructions
- **THEN** it SHALL receive the same single Implementation progress paragraph from `AGENTS.md`
- **AND** `CLAUDE.md` and the delivery skill SHALL refer to that paragraph rather than restate it

#### Scenario: Outcome awaits only CI or manual validation

- **WHEN** an outcome's code and tests are written but its tests can run only in CI or its behavior has not been manually validated
- **THEN** the agent SHALL check that item
- **AND** CI after readiness and the maintainer's optional review SHALL provide that validation

#### Scenario: Final implementation outcome finishes

- **WHEN** the last implementation outcome and every pre-ready input are complete
- **THEN** the agent SHALL finish acceptance, reconciliation, push, and final progress by checking the last item
- **AND** trusted automation, not the agent, SHALL own the ready-for-review transition

#### Scenario: Implementation cannot finish

- **WHEN** stale state, unwritten code or tests, an unfinished task, or another concrete condition prevents implementation completion
- **THEN** the agent SHALL leave the affected progress state truthful and report that blocker
- **AND** it SHALL NOT check incomplete work or invoke the ready mutation

#### Scenario: GitHub checks are green while implementation progress is stale

- **WHEN** GitHub reports completed CI checks but the PR-body Implementation items remain unchecked
- **THEN** the agent SHALL treat those as separate signals and reconcile only truthful implementation progress
- **AND** it SHALL NOT present CI check counts as implementation task completion
