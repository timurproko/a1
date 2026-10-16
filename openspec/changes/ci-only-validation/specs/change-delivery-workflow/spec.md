## ADDED Requirements

### Requirement: CI after readiness is the only implementation validation
Agents SHALL push implementation commits to the draft pull request without first running preflight, test suites, or other local validation, and SHALL check each Implementation item once its code, tests, and task bookkeeping are written. Exact-head CI that runs after the final item is checked and the pull request becomes ready SHALL be the only validation an implementation requires. Agents MAY run a local command to reproduce a failure CI already reported, or when the maintainer explicitly asks for one.

#### Scenario: Agent pushes implementation
- **WHEN** an agent has written code and tests for an approved Implementation outcome
- **THEN** it SHALL commit and push them to the draft pull request without running local validation first
- **AND** it SHALL check that item without waiting for any test result

#### Scenario: CI fails after readiness
- **WHEN** exact-head CI fails on a ready implementation pull request
- **THEN** the fix SHALL be pushed to the same branch and pull request
- **AND** the new head SHALL be revalidated by CI rather than by a local run

#### Scenario: Agent reproduces a reported failure
- **WHEN** CI has reported a specific failure and the agent needs to investigate it
- **THEN** the agent MAY run the matching local command for that failure
- **AND** that run SHALL NOT become a precondition for pushing
