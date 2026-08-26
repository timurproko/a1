## Why

`a1 pi` are instruments, not product. One exists so A1's rendering
can be compared against pinned Pi; the other exists so a resource can be tried
against an isolated profile before it touches a real one. Both answer questions a
person developing A1 has, and neither answers a question a person using A1 has.

Shipping them anyway costs more than the two lines of usage text they occupy. They
are the largest part of what a released `a1` appears to be — three commands, two of
which are somebody else's interface — and every one of them is a promise about
behaviour that has to hold in a release. A user who opens `a1 pi` to see what it
does has left the product without meaning to, into a profile A1 does not manage.

Prerelease builds are where that work already happens, and A1 already publishes
them on their own channel. So the instruments can live there and nowhere else.

## What Changes

- A release build exposes bare `a1`, `version`, `update`, `update:next`, and the
  package commands. It does not expose `pi`, does not name them in
  usage, and does not recognize the words — they are unknown subcommands, the same
  as any other word A1 does not know.
- A prerelease build exposes them exactly as it does today.
- Which build this is comes from the build's own version: a prerelease version is a
  `next`-channel build. Nothing configures it, and no environment variable grants
  it, so a released build cannot be argued into offering them.
  prepare the profile and launch directly rather than through the command line, so
  they do not pass through this at all — and neither does the parity comparison.

**BREAKING**: a released `a1 pi` stop working. Anyone who wants
them installs a prerelease with `a1 update:next`, or runs Pi directly.

## Capabilities

### Modified Capabilities

- `launch-profiles`: the interactive launch forms a build exposes depend on whether
  it is a prerelease, and the unknown-subcommand rule follows from that rather than
  from one fixed list.
