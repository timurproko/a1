## Why

The workflow says to push a pull request and carry on, and to come back "when CI
reports a result". In practice the coming back is what slips: work starts on top of
a change whose validation is failing, the failure is found later, and by then the
branch has drifted from `develop` and the fix costs a merge and a second full run.
It has happened repeatedly. The rule that produced it reads as permission to move
on, and says nothing about what to do when the answer arrives red.

The same waiting costs something at the other end. A specification change, a
documentation change, or a refactor whose tests prove nothing visible moved has
nothing to accept by hand, yet it sits green and unmerged until someone notices.

## What Changes

- Reading the result becomes part of pushing: not watched in the foreground, but
  read before anything else starts.
- A red pull request becomes the next task, ahead of new work, and no new work is
  stacked on a change whose validation is failing.
- A failure that is not this change's doing is still dealt with, because it fails
  every pull request behind it too.
- What CI said is reported rather than assumed. A result nobody read is not a result.
- A pull request that changes nothing a reader would see arms auto-merge and lands
  when validation passes. One that changes what a reader sees waits for the manual
  acceptance it needs — a feature is accepted before it lands, not explained after.
- `develop` requires the validation check, which is what auto-merge arms against.

**BREAKING**: none for the product. `develop` gains a required check, so a merge
waits for validation rather than racing it.

## Capabilities

### Modified Capabilities

- `continuous-integration`: the required check gates the merge rather than merely
  reporting, a failing pull request is addressed before further work, and a change
  with nothing to accept by hand merges on its own once validation passes.
