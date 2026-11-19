## Why

The TypeScript project already requires `verbatimModuleSyntax` and `isolatedModules` so that every module can be transformed file by file without type information. One construct still escapes that rule: constructor parameter properties, which 109 sites across 54 files (30 under `src/`, 24 under `test/`) use to declare and assign a field in the parameter list. That syntax needs the TypeScript emitter to generate the field and the assignment, so the sources cannot be run by a strip-only loader such as Node's built-in type stripping, and the class shape is not visible in the declaration list. The repository has no `enum` or `namespace` declarations, so parameter properties are the whole gap.

## What Changes

- Enable `erasableSyntaxOnly` in `tsconfig.json` next to `verbatimModuleSyntax`, so the source and test projects reject any syntax that only the TypeScript emitter can lower.
- Rewrite every constructor parameter property as an explicit field declaration plus an assignment at the top of the constructor body, after the `super` call when the class has one. Optional parameter properties become fields typed with an explicit `undefined` union rather than optional fields, which is the shape the emitter produced.
- Re-pin the startup graph byte baseline and the pinned Pi source ledger hashes for the three copied upstream components whose constructors changed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: TypeScript sources use only erasable syntax, enforced by the compiler option.

## Impact

No runtime behavior changes: every rewrite declares the same fields with the same visibility and assigns them at the same point of construction. The startup graph grows by 3,426 bytes of field declarations. `tsconfig.bin.json` checks plain JavaScript and is unaffected.
