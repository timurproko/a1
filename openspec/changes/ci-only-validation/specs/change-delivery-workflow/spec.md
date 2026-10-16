## ADDED Requirements

### Requirement: Agents push after targeted checks and rely on CI after readiness
Before pushing implementation commits to the draft pull request, agents SHALL run only quick targeted checks for what they changed: the repository type check, the test files that cover the changed code, and strict validation of the OpenSpec change. Agents SHALL NOT run preflight, `test:fast`, `test:full`, `test:release`, or broad directory-level test runs as a precondition for pushing. Agents SHALL check each Implementation item once its code, tests, and task bookkeeping are written. Exact-head CI that runs after the final item is checked and the pull request becomes ready SHALL be the validation authority. Agents MAY run a broader local command to reproduce a failure CI already reported, or when the maintainer explicitly asks for one.

#### Scenario: Agent pushes implementation
- **WHEN** an agent has written code and tests for an approved Implementation outcome
- **THEN** it SHALL run the type check, the touched test files, and strict change validation, and push once they pass
- **AND** it SHALL NOT run preflight or a broad test suite before that push

#### Scenario: A targeted check fails
- **WHEN** one of the targeted checks fails before a push
- **THEN** the agent SHALL fix the cause and rerun that check before pushing

#### Scenario: CI fails after readiness
- **WHEN** exact-head CI fails on a ready implementation pull request
- **THEN** the fix SHALL be pushed to the same branch and pull request
- **AND** the new head SHALL be revalidated by CI rather than by a full local run

#### Scenario: Agent reproduces a reported failure
- **WHEN** CI has reported a specific failure and the agent needs to investigate it
- **THEN** the agent MAY run the matching broader local command for that failure
- **AND** that run SHALL NOT become a precondition for later pushes
