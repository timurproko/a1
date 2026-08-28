## Why

The workflow says to push a pull request and carry on, and to come back "when CI
reports a result". In practice the coming back is what slips: work starts on top of
a change whose validation is failing, the failure is found later, and by then the
branch has drifted from `develop` and the fix costs a merge and a second full run.
It has happened repeatedly. The rule that produced it reads as permission to move
on, and says nothing about what to do when the answer arrives red.

The same waiting costs something at the other end. An OpenSpec-only or root
README-only change has nothing to accept by hand, yet it sits green and unmerged
until someone notices. Code is different even when it is behavior-preserving:
the maintainer still needs an opportunity to validate it locally.

## What Changes

- Reading the result becomes part of pushing: not watched in the foreground, but
  read before anything else starts.
- A red pull request becomes the next task, ahead of new work, and no new work is
  stacked on a change whose validation is failing.
- A failure that is not this change's doing is still dealt with, because it fails
  every pull request behind it too.
- What CI said is reported rather than assumed. A result nobody read is not a result.
- Auto-merge is limited to pull requests whose complete diff is under `openspec/**`
  and/or the root `README.md`.
- Any other path makes the pull request a code/operational change that waits for
  local maintainer acceptance and a manual merge, including behavior-preserving
  refactors and mixed specification-plus-code changes.
- `develop` requires the validation check, which is what auto-merge arms against.

**BREAKING**: none for the product. `develop` gains a required check, so a merge
waits for validation rather than racing it.

## Capabilities

### Modified Capabilities

- `continuous-integration`: the required check gates the merge rather than merely
  reporting, a failing pull request is addressed before further work, and only an
  OpenSpec/README-only pull request merges on its own once validation passes.
