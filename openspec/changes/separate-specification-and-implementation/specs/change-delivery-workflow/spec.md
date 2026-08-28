## ADDED Requirements

### Requirement: Specification approval precedes implementation
A request to prepare, write, design, or update a specification SHALL produce a specification-only delivery stream whose pull request changes only paths under `openspec/**`. The stream SHALL NOT include source, test, script, workflow, non-OpenSpec configuration, generated baseline, or implementation changes. Implementation SHALL begin only after the specification pull request has merged and the user explicitly requests implementation.

#### Scenario: User requests a specification
- **WHEN** the user asks an agent to prepare, write, design, or update a specification
- **THEN** the agent SHALL create an OpenSpec-only branch and pull request
- **AND** the agent SHALL NOT implement the specified behavior in that stream

#### Scenario: Specification is still open
- **WHEN** a specification pull request has not merged
- **THEN** implementation SHALL NOT begin or be stacked on its branch

#### Scenario: User requests implementation after specification merge
- **WHEN** the specification pull request has merged and the user explicitly asks to implement it
- **THEN** the agent SHALL fetch the resulting `origin/develop`
- **AND** SHALL create a new worktree, branch, commit history, and pull request for implementation
- **AND** the implementation pull request SHALL cite the accepted OpenSpec change

#### Scenario: Specification and implementation were combined accidentally
- **WHEN** a branch contains both specification and implementation changes before review
- **THEN** the changes SHALL be split into separate pull requests
- **AND** implementation SHALL follow the specification only after the specification merges

### Requirement: Auto-merge eligibility uses an exact documentation allowlist
A pull request SHALL be eligible for auto-merge only when every changed path is under `openspec/**` or is exactly the root `README.md`. Any pull request containing another path SHALL be classified as code/operational, regardless of whether it claims to preserve behavior. Classification SHALL examine the complete pull-request diff and SHALL fail closed.

#### Scenario: OpenSpec-only pull request
- **WHEN** every changed path is under `openspec/**`
- **THEN** the pull request MAY be armed for auto-merge after its required validation

#### Scenario: Root README-only pull request
- **WHEN** every changed path is exactly `README.md`
- **THEN** the pull request MAY be armed for auto-merge after its required validation

#### Scenario: Behavior-preserving refactor
- **WHEN** a pull request changes source or any other path outside the allowlist
- **THEN** it SHALL NOT be eligible for auto-merge
- **AND** a claim that behavior is unchanged SHALL NOT alter that classification

#### Scenario: Specification and code are mixed
- **WHEN** a pull request changes an OpenSpec path and any path outside the allowlist
- **THEN** the entire pull request SHALL be classified as code/operational
- **AND** it SHALL NOT be armed for auto-merge

#### Scenario: Changed paths cannot be classified
- **WHEN** the complete pull-request diff cannot be obtained or classified
- **THEN** auto-merge SHALL remain disabled

### Requirement: Code integration requires local maintainer acceptance
Every code/operational pull request SHALL remain open after automated validation so the maintainer can validate it locally. The agent SHALL provide exact applicable local run instructions and SHALL NOT invoke auto-merge. CI success SHALL NOT count as local acceptance. The pull request SHALL be merged manually only after the maintainer reports acceptance and explicitly authorizes the merge.

#### Scenario: Code pull request passes CI
- **WHEN** all required automated checks pass for a code/operational pull request
- **THEN** the pull request SHALL remain open
- **AND** the agent SHALL report that local maintainer validation and manual merge are still required

#### Scenario: Maintainer has not accepted locally
- **WHEN** the maintainer has not reported local acceptance
- **THEN** neither the agent nor repository automation SHALL merge the code/operational pull request

#### Scenario: Maintainer accepts and authorizes merge
- **WHEN** the maintainer reports successful local validation and explicitly authorizes integration
- **THEN** the pull request MAY be merged manually
- **AND** the merge result SHALL be reported
