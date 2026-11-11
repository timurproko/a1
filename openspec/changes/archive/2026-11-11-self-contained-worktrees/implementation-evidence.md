# Implementation evidence

## Result

The product exposes enter/attach/detach/list and keeps the prior session aliases. Successful attachment returns the exact canonical root and branch. Creation/resumption preserves existing edits and history, rejects primary/foreign/locked/colliding paths, disables checkout hooks, and never removes worktrees or branches. Temporary coordination and startup-registration recovery are internal. A missing own claim or runtime registration can reactivate; corrupt or foreign claims are not overridden.

Background observation activates once per session binding and does not rewrite healthy claims/registrations on each poll. Built-in tool wrappers borrow the current verified root at execution time, preserve absolute paths, and retain native rendering and tool selection. Comparison sessions and extension-provided overrides retain their original tools.

The identical short Worktrees block is present in this repository and the prepared XR Build migration. Repository-specific private setup, protected cleanup and merge authority remain separate. XR Build migration: public PR 7, documentation worktree `D:/Git/xrbuild/.worktrees/a1-worktree-guidance`; integration requires the compatible A1 installation first.

## Local validation

Reconciled current `origin/develop`, including the already integrated Pi 1.5.2 upgrade, before the final targeted checks.

- `npm run build:core`: passed.
- `npm run typecheck`: passed.
- `npm run check:architecture`: passed, including session-writer, identity, and pinned-source guards. The existing size ratchet was lowered, not relaxed.
- `npm run check:names`: passed, zero violations.
- `node scripts/governance/check-code-documentation.mjs --mode full`: passed.
- Strict OpenSpec change validation: passed.
- Twelve targeted Vitest files: 261 tests passed. Includes CLI grammar/aliases/results, actual Git fixtures, main/develop/remote-default bases, edited resumes, coordination snapshots, preserved prior attachment, corrupt and competing ownership, hook suppression, unrelated broken registrations, missing-claim recovery, registry lifetime, real SDK write cwd across entry/detach, and Pi cwd-recovery compatibility.
- Built checkout CLI help exposes the new command family; its `worktree list` completes in the actual active session.
- Read-only actual-session inventory repeated 24 times: current 24, unverifiable 0. Earlier installed-runtime investigation reproduced 16 current / 8 unverifiable in 24 XR Build checks. The controlled contention regression separately verifies the new snapshot behavior.
- XR Build: 15 focused instruction/worktree tests, name guard, and strict change validation passed. Private and KEEP preservation cases remain covered.

## Known-gap disposition

- This is source/build validation, not a published or installed release. Existing running agents retain their installed code. Integrate/publish the A1 capability before integrating the XR Build instruction migration; the maintainer owns that ordering and optional installed multi-session acceptance.
- Required exact-head remote CI is owned by trusted readiness/finalization automation and is reported separately; these local results do not claim remote success.
- Built-in tools follow attachments; custom extensions, project resource discovery, and independent terminals retain their documented cwd behavior and use the returned explicit root. Their automatic migration is outside this command contract.
- Real conflicting/unverifiable ownership and incompatible legacy writers remain protected. There is no silent takeover, branch replacement, merge, data deletion, or blanket claim-store reset.
- Editing claims remain cooperative; arbitrary external editors and repository cleanup registrations are separate concerns.
