## Why

npm installs pinned Pi's terminal package twice under A1: once as A1's own
dependency at the root, once nested inside `@earendil-works/pi-coding-agent`,
because Pi publishes an `npm-shrinkwrap.json` and npm honours it instead of
sharing a hoisted copy. Both are the same version. npm just cannot tell them
apart, and neither can anything else.

Two copies means two of every terminal class. Pi hands extensions the nested
copy; A1's renderer used the root one. An extension's `instanceof` check and its
prototype patches then landed on classes nothing rendered — extension chrome
disappearing with no error, input dead-ending with no error.

A1's answer was to delete the root copy and put a link there instead, at install
and again at every launch. It worked, and it cost more than it looked: the link
made a release fail to build on Linux and macOS, because payload discovery
refused to follow it. A program rearranging its own installed files on every
start is not a foundation to add to.

The duplication is not A1's to remove — only Pi can stop shipping the shrinkwrap
or start re-exporting the package. But *which copy A1 uses* was never a question
about the file layout. It is a question about resolution, and resolution is
something A1 can state.

## What Changes

- A1's package declares the subpath import `#pi-tui`, resolving to pinned Pi's
  copy first and to the hoisted one only when that is absent — which is exactly
  the case where one copy exists and both sides agree anyway.
- Every A1 module imports `#pi-tui` rather than the package name, so which copy
  A1 uses is stated in one place and enforced by Node at every import.
- Nothing rewrites the installed tree any more. The install-time repair and the
  launch-time repair are both gone, along with the link they created.
- Launch compares what A1 resolves against what Pi resolves and says so when
  they differ. The failure this bug is known for is silent; this makes it loud.

The alias is also the shape of the eventual fix. If Pi ever re-exports its
terminal package — as its own fork already does, via a `./tui` subpath — the
change here is one line, and no import site moves.

## Capabilities

### Modified Capabilities

- `pi-api-boundary`: A1 binds pinned Pi's terminal package through a declared
  alias resolving to Pi's own copy, rather than by rewriting the installed tree.
