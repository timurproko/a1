## 1. Relocate

- [x] 1.1 `git mv src/integrations/pi/tui-runtime/conformance.ts test/support/pi-tui-runtime-conformance.ts`; import the adapter, error, and port types from the `tui-runtime` public entry.
- [x] 1.2 Remove the `conformance.js` re-export from `src/integrations/pi/tui-runtime/index.ts`; point `test/integrations/pi/tui-runtime/conformance.test.ts` at `test/support/`.
- [x] 1.3 Empty `unreachableModules` in `config/architecture-allowlist.json`.

## 2. Proof

- [x] 2.1 Run `npm run typecheck`, `npm run check:architecture`, `npm run check:code-documentation`, the changed-documentation check, `test/integrations/pi/tui-runtime/conformance.test.ts`, and `npx vitest run test/repository-governance test/contracts`; record outcomes: all checks OK, 3 conformance cases pass, 1141 governance and contract cases pass; startup graph unchanged at 152 files and 1,432,617 bytes.
