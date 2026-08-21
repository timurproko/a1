# Local branch reconciliation

Dry run reviewed at `2026-08-21T06:18:12Z` on commit `dd5ae478fbc115fb352a8f1adbbfd6c88f75ea5a` with:

```sh
npm run branches:prune -- --json
```

The command left the working tree unchanged.

## Protected

- `change/govern-branch-lifecycle` (current)
- `develop`
- `master`

## Merged and deletable

- `fix/cold-start-materialization`
- `milestone/centralize-a1-product-identity`
- `milestone/harden-pi-api-boundary`
- `milestone/multi-agent-workspace`
- `milestone/owned-pi-ui-foundation`
- `milestone/republish-as-a1`

## Unmerged and retained

- `chore/shorter-activation-message`

Apply mode was not used during this review.

## Applied cleanup

At `2026-08-21T06:18:45Z`, the reviewed set was applied locally with:

```sh
npm run branches:prune -- --apply --json
```

All six merged-deletable branches listed above were deleted with Git safe deletion. No remote deletion was requested. The resulting local inventory is:

- `change/govern-branch-lifecycle` (current, retained)
- `chore/shorter-activation-message` (unmerged, retained)
- `develop` (protected, retained)
- `master` (protected, retained)

## Certification and post-merge obligation

At `2026-08-21T06:24:29Z`, `npm run check` passed in full and `openspec validate "govern-branch-lifecycle" --type change --strict --no-interactive` reported the change valid. The first full-test attempt had one unrelated five-second integration timeout; that test passed alone and in the successful complete rerun.

After `change/govern-branch-lifecycle` is merged into and pushed with `develop`, workflow must switch to `develop`, preview this source branch, safely delete it locally with `git branch -d`, and delete its non-protected remote counterpart when present. The current source branch is intentionally retained until then.
