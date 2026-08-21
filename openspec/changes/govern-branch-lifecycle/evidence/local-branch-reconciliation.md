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
