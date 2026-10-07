## 1. Delimiter-ready command completion

- [x] 1.1 Add focused failing tests for both bare-A1 history modes proving Tab completes ordinary and argument-bearing top-level command rows to `/<name>` with no trailing space and immediately shows the exact matching row, while Enter still submits the selected command and `a1 pi` retains pinned spacing.
- [x] 1.2 Add a bare-A1 autocomplete-provider adapter that delegates completion and removes only the generated top-level command spacer, preserving original suffix text, cursor placement, undo/change handling, and non-command completions.
- [x] 1.3 Reopen autocomplete through a fresh provider request only when Tab has applied the selected top-level row to the exact complete editor text; keep suffix, argument, resource, Enter, and comparison paths closed or unchanged.

## 2. Tunnel and argument safeguards

- [x] 2.1 Extend the owned editor's declared tunnel-colon exception so Tab-completing `skills` and then typing `:` immediately opens the existing `/skills:` tunnel; verify filtering, row labels, application, submission rewrite, extension-wrapper composition, copied-source provenance, and the deviation ledger remain current.
- [x] 2.2 Verify typing a space after a completed argument-bearing command still opens and applies its existing argument completions, while path/resource and comparison-profile completions remain unchanged.

## 3. Validation

- [x] 3.1 Run the focused shell autocomplete and skills-tunnel tests in both history modes, type checking, strict OpenSpec validation, and `git diff --check`; resolve failures without broadening command or colon semantics.

## Acceptance evidence

- `npm run build`
- `npx vitest run test/integrations/pi/components/skills-command-tunnel.test.ts test/integrations/pi/components/editor-autocomplete-placement.test.ts test/integrations/pi/components/shell-components.test.ts test/integrations/pi/components/pinned-editor-input-parity.test.ts` (84 tests passed)
- `npm run typecheck`
- `node scripts/governance/check-pinned-pi-source-ledger.mjs`
- `npm run check:code-documentation`
- `npm run check:architecture`
- `npx openspec validate complete-slash-commands-without-space --strict`
- `git diff --check`
