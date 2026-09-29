## Authorization

The maintainer approved the planning draft and explicitly requested implementation with “approved implement”. Implementation continued in the linked `D:/Git/a1/.worktrees/npm-x-installer-command` worktree and draft PR #620.

## Implemented result

- Root installation guidance, the published installer-package README, and the release runbook now use `npm x -y -- @timurproko/a1-install` for stable, development, numeric-preview, and exact-preview forms where each document presents them.
- The canonical silent-installer contract requires `npm x`, preserves the optional `-y` behavior, and requires the explicit `--` boundary so npm does not consume installer-owned options.
- Focused governance coverage reads all four current guidance surfaces, asserts the approved command forms, and rejects a return of `npx ... @timurproko/a1-install` guidance.
- Installer runtime code, package manifests, target selection, progress, activation, and verification remain unchanged.

## Focused validation

- `npm x -y -- @timurproko/a1-install --help` reached the published installer and returned its expected four-line help contract.
- `npm exec -- vitest run test/repository-governance/ci-release-runbook.test.ts test/foundation/release/installer-bootstrap.test.ts --maxWorkers=1 --minWorkers=1` passed: 2 files, 27 tests passed, 2 platform-specific tests skipped.
- `npm run check:docs-governance` passed with 74 inventoried legacy occurrences.
- `npm run check:architecture` passed architecture, product identity, pinned Pi source-ledger, and terminal-host provenance checks.
- `npm exec -- openspec validate use-npm-x-installer-command --strict` passed for the planning form. The first focused test attempt was blocked before collection because this new worktree had no complete dependency installation; `npm ci --ignore-scripts` restored the declared dependencies, after which the same focused tests passed.

## Known gaps

None. The published help probe establishes npm/package argument forwarding, while existing installer tests remain the authority for target parsing and installation behavior that this documentation-only invocation change does not modify.
