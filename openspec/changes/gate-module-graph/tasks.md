## 1. Module graph policy

- [ ] 1.1 Add `scripts/governance/module-graph-policy.mjs` (with `.d.mts`) exporting `collectModuleGraph(root)`, `findImportCycles(graph)`, `findUnreachableModules(graph, roots)`, and `inspectModuleGraph(root, allowlist)`; static edges include type imports for cycles, runtime edges reuse `runtimeRelativeImports` plus dynamic `import()` and `new URL(..., import.meta.url)` literals.
- [ ] 1.2 Collect roots from `bin/*.js` `dist/` references, `package.json` `bin` and `exports`, `STARTUP_ROOTS`, and `entryModules` from the allowlist; exempt `index.ts` from reachability.
- [ ] 1.3 Report unlisted cycles with members, unlisted unreachable modules by path, listed entries that no longer hold as stale, and declared entries that are imported as stale.

## 2. Allowlist and wiring

- [ ] 2.1 Add `config/architecture-allowlist.json` recording the current 3 cycles, the current unreachable modules, and the 4 declared process entries.
- [ ] 2.2 Call `inspectModuleGraph` from `check-architecture.mjs` for the real repository root.

## 3. Proof

- [ ] 3.1 Add `test/repository-governance/module-graph-policy.test.ts` with fixture repositories: an unlisted cycle fails with members, a listed cycle passes, a stale listed cycle fails, an unreachable module fails, an `index.ts` is exempt, a declared entry passes, and a declared entry with an importer fails.
- [ ] 3.2 Run `npm run check:architecture`, `npm run typecheck`, the repository-governance suite, and `check:code-documentation`; record outcomes here.
