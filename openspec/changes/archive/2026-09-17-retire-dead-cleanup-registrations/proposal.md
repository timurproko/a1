## Why

Two merged deliveries left cleanup registrations that can never complete. #461 was finalized on a base one commit behind `develop`; #463 merged first and edited the same specification file, so the bytes at #461's merge commit no longer match the digests in its acceptance manifest and post-merge verification reports `delivery-content-drift`. #452 merged without an `openspec-implementation` fence, so verification reports `source-association`. Both worktrees and branches are already gone (one by the maintainer's explicit manual removal, one by an earlier session), yet every `sweep` still re-verifies each entry (about ten seconds of GitHub reads apiece), reports it `blocked`, and the journal keeps them forever. The drift itself was allowed by GitHub: the `develop` ruleset requires `Development validation required` but not an up-to-date base, so a candidate validated against a stale base could merge without the re-finalization that the delivery workflow already says an advanced target baseline requires.

## What Changes

- Retire a released registration during `sweep` (and for the exact candidate in `complete`) when there is nothing left to remove: the worktree path is absent, Git holds no registration for it (or only its own dangling one, which is retired), the local topic ref is absent, and the pull request is verified merged into `develop` in this repository. Retirement records `retired-nothing-left` with the evidence reason that would otherwise block, exercises no deletion authority, and marks the journal complete so later sweeps stop re-verifying it.
- Add an explicit `forget --id ID --confirm-nothing-left` operation for an entry whose path, Git registration, and local ref are all absent regardless of pull-request state (for example a rejected candidate whose leftovers the maintainer removed by hand). It deletes nothing, records `forgotten`, and refuses while any of the three still exists.
- Require an up-to-date base for merging into `develop`: set `strict_required_status_checks_policy` to true in the repository governance definition and specification, so a candidate whose base advanced shows `BEHIND`, is updated, re-finalized by the trusted workflow with fresh digests, and revalidated before the maintainer can merge. The maintainer applies the reviewed definition with the existing policy application command after merge.
- Update `docs/local-worktree-cleanup.md` and the delivery guidance for the update-branch step; the delivery workflow specification already requires renewed validation for an advanced target, so it is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: nothing-left retirement during sweep and completion, and explicit `forget`.
- `github-repository-governance`: `develop` requires an up-to-date base before merge.

## Impact

Implementation affects `scripts/governance/local-cleanup-reconcile.mjs`, `scripts/governance/local-cleanup-complete.mjs`, `scripts/governance/local-worktree-cleanup.mjs`, `scripts/governance/local-cleanup-state.mjs` (a `retired` completion step), their fixtures under `test/repository-governance/`, `config/github-repository-governance.json`, `docs/local-worktree-cleanup.md`, `openspec/config.yaml`, `.agents/skills/change-delivery/SKILL.md`, and the two specifications. It does not change what counts as accepted evidence, the ownership rules, discard, or branch pruning, and it never deletes a worktree, ref, or remote ref that still exists.
