## 1. Compiler option

- [x] 1.1 Add `"erasableSyntaxOnly": true` to `tsconfig.json` after `verbatimModuleSyntax`; `tsconfig.build.json` inherits it and `tsconfig.bin.json` checks plain JavaScript.

## 2. Rewrite

- [x] 2.1 Rewrite the 109 constructor parameter properties in 54 files as field declarations and constructor assignments, keeping visibility and `readonly`, keeping parameter defaults in the parameter list, and placing assignments after `super`.
- [x] 2.2 Declare the three optional parameter properties as fields with an explicit `undefined` union so `exactOptionalPropertyTypes` holds.

## 3. Baselines and proof

- [x] 3.1 Re-pin `config/startup-graph-baseline.json` (151 files, 1,463,487 bytes) and regenerate `config/baselines/pinned-pi-source-port-ledger.json` for the three copied upstream components (`session-footer`, `skill-invocation-message`, `owned-editor`).
- [x] 3.2 `npm run typecheck`, `npm run check:architecture`, `npm run check:code-documentation`, the ledger and inventory checks, and the governance, contract, foundation, feature, integration, composition, and app suites pass.
