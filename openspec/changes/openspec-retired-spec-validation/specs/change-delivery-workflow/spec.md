## MODIFIED Requirements

### Requirement: Finalization accepts a declared capability retirement
A capability is retired by a change only when the change metadata declares `retire_capabilities: true` and the change's delta for it only removes requirements. Finalization, ready-candidate validation, and post-merge verification SHALL accept the absence of a retired capability's canonical spec and SHALL exclude it from the spec digest; ready-candidate validation SHALL accept the PR deleting it. Any other missing or changed spec SHALL still block the delivery.

#### Scenario: A change retires a capability
- **WHEN** a change declaring `retire_capabilities: true` removes every requirement of a capability and archiving deletes its canonical spec
- **THEN** finalization SHALL archive the change and record a spec digest that excludes the retired capability
- **AND** post-merge verification SHALL accept the delivery

#### Scenario: A spec is missing without a retirement
- **WHEN** a capability's canonical spec is absent but the change does not declare retirement, or its delta adds, modifies, or renames requirements
- **THEN** finalization SHALL stop with `delivery-spec-missing` and the PR SHALL stay draft

#### Scenario: A ready candidate deletes the specs it retires
- **WHEN** finalized-delivery validation checks a ready PR whose changed files delete the canonical specs of the capabilities it retires
- **THEN** validation SHALL accept those deletions
- **AND** it SHALL still refuse any other changed spec path with `delivery-unexpected-openspec-path`
