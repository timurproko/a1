## Why

A preview is published as `<version>-dev.<commit>`, so an installed one already
says which commit produced it. Reading that back was the only thing anyone could
do with it: there was no way to ask for a particular preview, only for the newest.

That is the case where it matters most. A preview is how a change is tried before
it is released, and trying one means installing exactly the build somebody
mentioned — in a pull request, in a report, in a version string pasted into a
message — not whatever happens to be newest by the time you type the command.

## What Changes

- `a1 update:<commit>` installs the preview built from that commit, resolving it
  against what the registry actually published.
- A full version is accepted in the same position, for anyone reading one back
  from `a1 --version`.
- A commit that was never published is refused by name, and one that somehow
  matches more than one published version is refused rather than guessed at.
- `a1 update:next` keeps meaning the newest preview, and `a1 update` keeps meaning
  the current release.

## Capabilities

### Modified Capabilities

- `cli-self-update`: what follows the colon names which build to move to, rather
  than only which channel.
