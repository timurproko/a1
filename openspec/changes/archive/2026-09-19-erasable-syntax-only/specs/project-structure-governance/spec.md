## ADDED Requirements

### Requirement: TypeScript sources use only erasable syntax
The source and test TypeScript projects SHALL enable `erasableSyntaxOnly` alongside `verbatimModuleSyntax` and `isolatedModules`, so that removing type annotations from any module yields the runtime JavaScript without emitter-generated code. Constructor parameter properties, `enum`, `namespace`, and `import x = require()` SHALL NOT appear in `src/` or `test/`; a class SHALL declare its fields explicitly and assign them in the constructor body.

#### Scenario: A constructor declares a parameter property
- **WHEN** a constructor parameter carries a `public`, `private`, `protected`, `readonly`, or `override` modifier
- **THEN** the `typecheck` script SHALL fail on that parameter until the field is declared on the class and assigned in the constructor

#### Scenario: A non-erasable declaration is added
- **WHEN** an `enum` or `namespace` declaration is added under `src/` or `test/`
- **THEN** the `typecheck` script SHALL fail with the erasable-syntax diagnostic for that declaration
