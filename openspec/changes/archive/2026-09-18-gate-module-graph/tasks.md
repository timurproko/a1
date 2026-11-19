## 1. Module graph policy

- [x] 1.1 Add `scripts/governance/module-graph-policy.mjs` (with `.d.mts`) exporting `collectModuleGraph(root)`, `findImportCycles(graph)`, `findUnreachableModules(graph, roots)`, and `inspectModuleGraph(root, allowlist)`; static edges include type imports for cycles, runtime edges reuse `runtimeRelativeImports` plus dynamic `import()` and `new URL(..., import.meta.url)` literals.
- [x] 1.2 Collect roots from `bin/*.js` `dist/` references, `package.json` `bin` and `exports`, `STARTUP_ROOTS`, and `entryModules` from the allowlist; exempt `index.ts` from reachability.
- [x] 1.3 Report unlisted cycles with members, unlisted unreachable modules by path, listed entries that no longer hold as stale, and declared entries that are imported as stale.

## 2. Allowlist and wiring

- [x] 2.1 Add `config/architecture-allowlist.json` recording the current 3 cycles, the 31 current unreachable modules, and 2 declared process entries (`public-main-entry.ts`, `paste-text-worker.ts`); the forked paste and copy helpers are reached through their `new URL(..., import.meta.url)` references and needed no declaration.
- [x] 2.2 Call `inspectModuleGraph` from `check-architecture.mjs` for the real repository root, passing the sources it already read.

## 3. Proof

- [x] 3.1 Add `test/repository-governance/module-graph-policy.test.ts` with fixture repositories: an unlisted cycle fails with members, a listed cycle passes, a stale listed cycle fails, an unreachable module fails, an `index.ts` is exempt, a declared entry passes, and a declared entry with an importer fails.
- [x] 3.2 Run `npm run check:architecture`, `npm run typecheck`, the repository-governance suite, and `check:code-documentation`; record outcomes: `check:architecture` OK in 778 ms, `npm run typecheck` clean, `npx vitest run test/repository-governance` 1064 passed with the known spawn-timeout flake in `terminal-architecture-policy.test.ts` under parallel load (passes alone in 715 ms), `check:code-documentation` OK.
