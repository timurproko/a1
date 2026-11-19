## ADDED Requirements

### Requirement: Shipped entry code is type-checked in place
Every JavaScript file under `bin/` that ships in the package SHALL pass the same strict TypeScript checking as `src/`, through a dedicated `checkJs` project that the `typecheck` script runs after the source project. Types SHALL be supplied by JSDoc annotations in the files themselves; the files SHALL stay plain JavaScript in `bin/` because they inspect dependency resolution and compose the process, which the Pi API boundary keeps out of `src/`. A parameter, variable, or property whose type cannot be inferred SHALL be annotated rather than left implicitly `any`, and a value the launch context makes optional SHALL be narrowed before it is passed to a typed `dist/` function.

#### Scenario: An entry passes an unchecked value into typed code
- **WHEN** a `bin/` entry hands a possibly undefined launch-context value to a `dist/` function that requires it
- **THEN** the `typecheck` script SHALL fail on the entry until the value is checked

#### Scenario: A helper gains an untyped parameter
- **WHEN** a function in `bin/` is added or changed without a JSDoc type for one of its parameters
- **THEN** the `typecheck` script SHALL fail with the implicit-any diagnostic for that parameter

#### Scenario: The checked files are the shipped files
- **WHEN** the package is built and packed
- **THEN** the `bin/` files the tarball carries SHALL be byte-for-byte the files the `checkJs` project checked, with no emitted or copied variant
