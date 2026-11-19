## ADDED Requirements

### Requirement: Finalization accepts a declared capability retirement
A capability is retired by a change only when the change metadata declares `retire_capabilities: true` and the change's delta for it only removes requirements. Finalization and post-merge verification SHALL accept the absence of a retired capability's canonical spec and SHALL exclude it from the spec digest; any other missing spec SHALL still block the delivery.

#### Scenario: A change retires a capability
- **WHEN** a change declaring `retire_capabilities: true` removes every requirement of a capability and archiving deletes its canonical spec
- **THEN** finalization SHALL archive the change and record a spec digest that excludes the retired capability
- **AND** post-merge verification SHALL accept the delivery

#### Scenario: A spec is missing without a retirement
- **WHEN** a capability's canonical spec is absent but the change does not declare retirement, or its delta adds, modifies, or renames requirements
- **THEN** finalization SHALL stop with `delivery-spec-missing` and the PR SHALL stay draft
