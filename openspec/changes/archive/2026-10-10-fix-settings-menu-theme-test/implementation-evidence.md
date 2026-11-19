# Implementation Evidence

## Delivered behavior

- The settings route theme test opens the `Mode` menu with the pointer, presses Down once, and checks that `always` carries the standard selection background while the `✓` on the inactive value in effect stays neutral.
- No product code changes.

## Validation

- Before the fix, `npx vitest run test/composition/settings-route-host.test.ts` on `395529ed` failed with the same assertion as stable candidate run 38066662140.
- `npx vitest run test/composition/settings-route-host.test.ts test/features/owned-ui/settings-app.test.ts test/ui/components/value-menu.test.ts` — passed: 73 tests across 3 files.
- `npm run typecheck` — passed.
- `npx openspec validate fix-settings-menu-theme-test --strict --no-interactive` — passed.
- `git diff --check` — passed.

## Known gaps

None. Stable candidate validation for 0.2.6 has to be dispatched again after this merges.
