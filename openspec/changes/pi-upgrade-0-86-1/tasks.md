## 1. Upgrade

- [x] 1.1 Pin both Pi packages at 0.86.1 and refresh the lockfile.
- [x] 1.2 Re-merge the vendored copies and regenerate the ledger, headers, inventories, baselines, and parity evidence.
- [x] 1.3 Resolve the one conflict marker: upstream gives the extension editor an optional description under its title, carried into the owned copy. Nothing was orphaned, no component unmapped, and neither changed public API surface is consumed by A1.
- [x] 1.4 Adopt the Meta Muse provider: mirror its default model in the owned resolver map and record the row as reached through the pinned engine. Re-evaluate the documented deprecated-dependency exception at this pin; `node-domexception@1.0.0` still arrives through the engine, so it stands.
- [x] 1.5 Re-pin the derived state this version moves: the Pi startup artifact (2,044 files, 9,419,127 bytes), the owned startup graph, the damage-grammar boundary, the owned command resources, the parity fixtures with their recorded digests, and the pinned identity in the session-shell provenance, parity acceptance, and command workflow outcome baselines.

## 2. Proof

- [x] 2.1 Every automated gate passes on the resolved head: `npm run typecheck`, `npm run check:architecture` (all five checks), `npm run check:deprecated`, `npm run check:code-documentation:changed`, and `npx vitest run test/repository-governance test/features/owned-ui test/integrations/pi`, except for failures this Windows checkout causes rather than the tree: CRLF text assertions (`change-delivery-guidance`, `ci-release-runbook`, `full-regression-policy`, `pi-upstream-sync-workflow`, `release-command`, `release-pipeline-policy`) and `local-cleanup`, which takes 50 s and times out only under parallel load.
- [x] 2.2 User-visible Pi behavior changes: an extension-supplied editor dialog can show a description under its title; Meta (Muse) sign-in is available through `/login meta` or `META_API_KEY`; clipboard copy falls back to OSC 52 where no display is available; and z.ai `Prompt too long` is recognized as context overflow. The two `/bug` fixes do not apply, since A1 declines that route.
