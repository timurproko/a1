## 1. Split

- [x] 1.1 Extract the helper region into `test/integrations/pi/session-ui/session-shell-fixture.ts` with exported doubles and fixtures and pruned imports.
- [x] 1.2 Move the 133 cases verbatim into `session-shell-compaction`, `-paste` (21), `-selection` (16), `-links` (12), `-suggestions` (6), `-lifecycle` (20), `-viewport` (10), `-history` (7), `-workflows` (13), and the remaining 21 command, notice, and presentation cases in `session-shell.test.ts`; each file imports only what it uses.

## 2. Registries

- [x] 2.1 Add `session-shell-paste.test.ts` to the resource-sensitive partition in `config/validation-suites.json`, the active partition in `resource-sensitive-validation.test.ts`, the expected list in `validation-suite-policy.test.ts`, and the partition count in `validation-tier.test.ts` (19 to 20).
- [x] 2.2 Update the import-graph proof in `validation-ownership.test.ts`: the suggestion fixture now reaches the selection and suggestions suites.

## 3. Proof

- [x] 3.1 `npx vitest run test/integrations/pi/session-ui/session-shell --no-file-parallelism --testTimeout=30000`: 10 files, 301 passed, matching the monolith's 301.
- [x] 3.2 `npm run typecheck`, `check:architecture`, `check:code-documentation`, and the four governance suites above: all OK, 64 passed.
