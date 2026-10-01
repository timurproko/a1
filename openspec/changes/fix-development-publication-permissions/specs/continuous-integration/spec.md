## ADDED Requirements

### Requirement: Publication wrappers satisfy the reusable permission envelope

Every trusted repository workflow that calls the reusable publisher SHALL grant a caller permission ceiling sufficient for every nested job declared by that publisher, because GitHub validates the complete reusable-workflow graph before evaluating channel-specific job conditions. The reusable publisher SHALL continue to define narrower workflow-level defaults and explicit job-level overrides so the caller ceiling does not grant write authority to jobs that do not request it. Focused repository policy SHALL reject a known publication wrapper whose declared ceiling cannot instantiate the reusable publisher.

#### Scenario: Development publication calls the shared publisher

- **WHEN** the trusted default-branch `develop.yml` wrapper dispatches the reusable publisher in development mode
- **THEN** GitHub SHALL accept the reusable-workflow call and create its selected jobs rather than end with a startup failure caused by nested permission declarations
- **AND** stable-only write-scoped jobs SHALL remain skipped while executing development jobs retain their declared narrower permissions

#### Scenario: A publication wrapper loses a required permission

- **WHEN** a repository wrapper that calls `publish.yml` grants less authority than any nested publisher job statically requests
- **THEN** focused workflow policy SHALL fail before that wrapper can be merged
