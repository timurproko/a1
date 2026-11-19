## ADDED Requirements

### Requirement: Complete ordinary regression bounds worker fanout
The complete non-physical validation plan SHALL retain file parallelism for its ordinary Vitest partition while enforcing an explicit maximum of two workers. The bound SHALL be applied by the authoritative `full-release` plan used by scheduled and manual Full regression, selected pull-request Full regression, and complete release validation. Plan and outcome evidence SHALL identify the bounded-parallel execution class and exact worker maximum.

The worker bound SHALL NOT remove or reclassify tests, suppress output, add retries, relax assertion or timeout behavior, alter isolated/resource-sensitive/package partitions, or reduce any supported platform/runtime lane. A test failure, process error, or existing timeout expiry SHALL continue to fail its owner and aggregate.

#### Scenario: Complete validation plans its ordinary partition
- **WHEN** any caller expands `full-release`
- **THEN** the complete ordinary Vitest invocation SHALL retain file parallelism with at most two workers
- **AND** its evidence SHALL record the bounded-parallel class, worker maximum, timeout source, retry count, and per-file timing source

#### Scenario: Complete coverage is retained under the worker bound
- **WHEN** the bounded ordinary partition executes
- **THEN** every test selected before the bound SHALL still execute exactly once in its applicable partition and native lane
- **AND** existing assertions, timeouts, isolated owners, resource-sensitive owners, package owners, and failure semantics SHALL remain unchanged
