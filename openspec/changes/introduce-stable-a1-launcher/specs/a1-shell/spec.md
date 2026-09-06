## ADDED Requirements

### Requirement: Every public invocation enters through the stable launcher
Every supported `a1` invocation SHALL begin in the installed stable launcher and then delegate to one compatible verified runtime. The launcher SHALL preserve the existing command grammar, profile selection, terminal behavior, exit status, and user-facing runtime version presentation. Launcher implementation details and the internal runtime package SHALL remain absent from ordinary successful output.

#### Scenario: Interactive command is invoked
- **WHEN** the user runs `a1` or `a1 pi`
- **THEN** the stable launcher SHALL select one compatible immutable runtime and preserve the existing interactive behavior

#### Scenario: Noninteractive command is invoked
- **WHEN** the user requests help, version information, update, or another supported noninteractive operation
- **THEN** the launcher SHALL route it without adding a second command grammar or changing established output

#### Scenario: Runtime cannot be selected
- **WHEN** no installed or retained runtime is both verified and launcher-compatible
- **THEN** the launcher SHALL remain callable and report bounded recovery guidance

## MODIFIED Requirements

### Requirement: Package identity is authoritative throughout release handling
The public command and launcher distribution SHALL use `@timurproko/a1` as their sole accepted public package identity. Application runtime discovery, update, immutable release derivation, validation, publication evidence, and registry verification SHALL use the internal `@timurproko/a1-runtime` identity only through the launcher-owned runtime protocol. The runtime package SHALL expose no public npm executable. The product SHALL reject every other package identity and SHALL NOT restore compatibility for the obsolete predecessor package identity.

#### Scenario: Materialize the new package
- **WHEN** the launcher derives or validates an immutable release from installed runtime content
- **THEN** it SHALL accept `@timurproko/a1-runtime` metadata bound to the launcher protocol and SHALL reject unrelated or obsolete package identities

#### Scenario: Query release channels
- **WHEN** `a1 --version` or `a1 update` resolves runtime metadata
- **THEN** registry queries SHALL use the runtime package's declared stable or development tag while ordinary output continues to identify the product as A1

#### Scenario: Inspect public package metadata
- **WHEN** the launcher package is packed or installed
- **THEN** its manifest SHALL name `@timurproko/a1` and its npm bin map SHALL contain exactly the `a1` executable
