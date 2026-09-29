## ADDED Requirements

### Requirement: The generated public Pi context retains one validated runtime package identity

When A1 configures its generated public Pi startup context, it SHALL validate and retain the selected public package root as process-lifetime runtime state before any rewritten lazy import can use it. Subsequent public Pi module URL and documented dependency-export resolution SHALL use that retained identity rather than mutable process environment state. A1 SHALL continue to expose the selected root through the upstream-compatible environment value, but deleting, clearing, or replacing that value after configuration SHALL NOT break or redirect the running context.

Configuration of the same package root SHALL be idempotent. An attempt to configure a different package root after the context is active SHALL fail before changing the retained identity. Resolution without successful configuration, or after the retained package becomes unavailable, SHALL fail with a bounded diagnostic rather than falling back to another installed or ambient Pi package.

#### Scenario: Submit a screenshot after environment state changes

- **WHEN** the generated startup context has validated its pinned Pi package, later in-process code deletes, clears, or replaces `PI_PACKAGE_DIR`, and the user submits a screenshot attachment
- **THEN** the lazy Pi image modules and documented dependency exports SHALL still resolve from the originally validated package root
- **AND** attachment submission SHALL NOT adopt the replacement environment path or fail because that path is unconfigured

#### Scenario: The same package is configured again

- **WHEN** the active generated startup context is configured again with the same validated public package root
- **THEN** configuration SHALL succeed without changing module identity

#### Scenario: A different package is configured after startup

- **WHEN** the active generated startup context is configured with a different public package root
- **THEN** configuration SHALL fail before changing the retained package identity or its resolution results

#### Scenario: Lazy resolution occurs without a usable retained package

- **WHEN** lazy public-module resolution runs before successful configuration or the retained package manifest is no longer available
- **THEN** resolution SHALL fail with a bounded configuration or availability diagnostic
- **AND** SHALL NOT search for or select another Pi installation
