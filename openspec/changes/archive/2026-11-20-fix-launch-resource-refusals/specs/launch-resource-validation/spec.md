# Spec Delta

## Purpose

Defines which extension-resource failures can refuse a launch and how expected launch refusals are explained to the person invoking A1.

## ADDED Requirements

### Requirement: Unnamed project failures do not become invocation failures

A1 SHALL NOT refuse an otherwise valid launch solely because an automatically discovered project extension that was not explicitly requested fails to load or register a provider. Such failures SHALL remain available through the same diagnostics as a launch without invocation options.

#### Scenario: Model and effort selection with a broken project extension

- **WHEN** a trusted project contains an unnamed failing extension and a launch selects an available authenticated provider, model and thinking level
- **THEN** A1 starts with those selections and retains the discovered extension failure as a diagnostic

#### Scenario: Session and trust options with a broken project extension

- **WHEN** a trusted project contains an unnamed failing extension and a launch supplies session options or an invocation trust grant
- **THEN** A1 starts without promoting that extension failure to a launch refusal

#### Scenario: Unnamed provider registration failure

- **WHEN** a discovered project extension fails to register its provider but the selected model remains usable
- **THEN** A1 starts and retains the provider registration diagnostic

### Requirement: Explicit resource failures refuse startup

A1 SHALL refuse startup when an explicitly requested extension cannot load or register its required resources, or when an invocation extension flag has no loaded registration or a value of the wrong type. Directory and package extension sources SHALL retain this explicit-request policy for their resolved entries.

#### Scenario: Explicit extension import fails

- **WHEN** a launch explicitly requests an extension whose import throws
- **THEN** A1 refuses startup rather than starting without the requested extension hooks

#### Scenario: Explicit extension path is missing

- **WHEN** a launch explicitly requests a nonexistent extension path
- **THEN** A1 refuses startup and identifies the missing path

#### Scenario: Explicit source expands to a failing extension

- **WHEN** a requested directory or package source resolves to an extension entry that fails to load
- **THEN** A1 refuses startup and identifies the failed entry

#### Scenario: Explicit extension provider registration fails

- **WHEN** an explicitly requested extension loads but its provider registration fails
- **THEN** A1 refuses startup and identifies the extension and registration error

#### Scenario: Extension flag cannot be applied

- **WHEN** an invocation extension flag is unregistered or has a value of the wrong type
- **THEN** A1 refuses startup and identifies the flag and why it cannot be applied

### Requirement: Expected launch refusals explain themselves in the terminal

Expected launch-option and resource refusals SHALL exit unsuccessfully and print the rejected option or resource and its reason as terminal-safe plain text. A1 SHALL NOT replace these reasons with only an unexpected-error notice and a crash-record path. Unexpected runtime crashes SHALL retain their existing private diagnostic behavior.

#### Scenario: Resource refusal through either normal-product entry

- **WHEN** ordinary A1 or its Pi-compatible adapter refuses a failing explicit extension
- **THEN** its terminal output names the extension and the load error without classifying the refusal as an unexpected crash

#### Scenario: Terminal controls in an error

- **WHEN** an explicit resource failure contains terminal control characters
- **THEN** the refusal text is printed without executing those control characters

#### Scenario: Unrelated unexpected exception

- **WHEN** startup fails with an unexpected exception unrelated to invocation refusal
- **THEN** A1 retains the existing crash cleanup and private diagnostic policy
