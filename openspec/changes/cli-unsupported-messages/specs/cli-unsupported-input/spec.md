## ADDED Requirements

### Requirement: Unsupported input is reported plainly

When the CLI refuses a command, option or input it does not support, it SHALL say that the item is not supported, without describing delivery progress or future plans.

#### Scenario: Unsupported command

- **WHEN** a user runs `a1 config`
- **THEN** the CLI fails with the message that `config` is not supported

#### Scenario: Unsupported Pi option

- **WHEN** a user passes a Pi option the CLI does not support
- **THEN** the CLI fails with the message that the option is not supported

#### Scenario: File input

- **WHEN** a user passes an `@path` input
- **THEN** the CLI fails with the message that file and image inputs are not supported
