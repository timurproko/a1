## ADDED Requirements

### Requirement: Unused code fails the type check
The TypeScript configurations evaluated by `npm run typecheck` SHALL enable `noUnusedLocals` and `noUnusedParameters`, so an unused import, local binding, or parameter in production, entry, or test code fails every validation tier that includes the type check. An unused parameter that an interface requires SHALL be kept with a leading-underscore name rather than excluded from the check.

#### Scenario: An unused import is introduced
- **WHEN** a source file imports a name it never references
- **THEN** `npm run typecheck` SHALL fail and name the file and symbol

#### Scenario: An interface requires a parameter the implementation ignores
- **WHEN** an implementation must accept a parameter to satisfy a port
- **THEN** the parameter SHALL be named with a leading underscore and the type check SHALL pass without a per-file exclusion
