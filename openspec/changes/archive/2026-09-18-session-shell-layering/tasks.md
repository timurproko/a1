## 1. Layering

- [x] 1.1 Move `src/integrations/pi/session-ui` to `src/app/session-shell` and `test/integrations/pi/session-ui` to `test/app/session-shell`; rewrite relative imports, fixture and `dist/` URLs, baselines, validation suites and ownership, integration owners, the startup-graph baseline, the architecture allowlist, and documentation references.
- [x] 1.2 Declare the `session-shell` owner (layer `app`) in `project-structure-policy.mjs` with its allowed providers; retire `pi-session-ui-integration`; extend the vendor-neutral feature check and the owned-UI pattern checks to the new path.
- [x] 1.3 Expand every owner `index.ts` from `export *` to named exports (`export type` for type-only symbols); reject `export *` in public entries.
- [x] 1.4 Limit deep imports to `composition` and to startup modules importing leaves of providers whose entry is a prohibited startup entry; redirect the seven imports that no longer qualify to `contracts/owned-ui/index.ts`.
- [x] 1.5 Add `inspectLayerBoundaries` (contracts import nothing; `ui/components` import only contracts; only `src/integrations/pi` imports `@earendil-works/*`) and run it from `check-architecture.mjs`.
- [x] 1.6 Bound the recorded `changedPaths` in `classifyRenderingImpact` to 256 while classifying from every path.
- [x] 1.7 Update `docs/architecture/project-structure.md` and `docs/architecture/boundaries.md`.

## 2. Proof

- [x] 2.1 Add policy cases: `export *` rejection, composition-only and startup-leaf deep imports, the three layer boundaries; add the directory-move case to `validation-impact.test.ts`; rename `pi-session-ui-responsibilities.test.ts` to `session-shell-responsibilities.test.ts`.
- [x] 2.2 Re-pin `config/startup-graph-baseline.json` (153 files, 1,443,318 bytes); run `npm run build`, `npm run typecheck`, `npm run check:architecture`, `npm run check:code-documentation`, the changed-documentation check, and `npx vitest run test/repository-governance test/contracts test/composition test/app test/features test/integrations test/ui test/cli`; record outcomes: all checks OK; 2222 cases pass with three contention timeouts (`editor-text-paste`, `clipboard-packaged`) that pass alone.
