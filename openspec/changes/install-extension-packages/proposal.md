## Why

Pi has a published extension ecosystem, and A1 already knows how to load from it.
Bare `a1` runs against `~/.a1/agent`, and the session it builds resolves that
profile's `settings.json` packages and `<root>/extensions` exactly the way Pi
resolves its own. An extension placed in the A1 profile by hand loads today, and
loads only for bare `a1`.

What is missing is the other half: nothing in A1 can put one there. `a1` recognizes
five subcommands, all of them launch or maintenance, and rejects any argument after
them. So the answer to "how do I add an extension to A1" is currently to run Pi's
installer against a profile Pi does not know about, or to unpack a package by hand.
Neither is an answer anyone should have to find.

The install itself needs no new machinery. Pi's package manager is a documented
public export that takes the profile root as an argument, and A1 already resolves
that root for every launch. This is a command surface, not an engine change.

The first package-command implementation routes the operations correctly, but its
terminal transcript invents an A1 presentation around them. It adds product and
profile prose, changes Pi's list heading and filtered marker, drops Pi's terminal
emphasis, and appends a restart advisory after install. The package namespace is a
compatibility surface, so a user moving between `pi` and `a1 pi` should see the same
package-manager conversation rather than two presentations of the same operation.

## What Changes

- `a1 pi install`, `a1 pi remove` (alias `a1 pi uninstall`), and `a1 pi list`
  manage Pi extension packages in A1's own profile at `~/.a1/agent`. They accept
  Pi's source grammar unchanged — npm, git, and local paths.
- `a1 pi update --extensions` updates every installed package and a positional
  source updates one. `a1 update --models` remains top-level and refreshes A1's
  model catalogs. Bare `a1 update` keeps meaning A1 self-update, and
  `a1 update self` says the same thing in Pi's spelling.
- `a1 update pi` is refused. A1 pins one Pi version and certifies releases against
  it, so a Pi self-update from inside A1 would invalidate the thing that was
  certified.
- The vanilla Pi profile get no package commands. Pi itself manages
  accumulate installs. Since no other profile is reachable, no profile prefix or
  flag exists to reach one — every package command means the A1 profile.
- Package commands run entirely in the installed package process, without
  materializing a release, starting the supervisor, or touching the foreground
  lease.
- For install, remove, list, and extension update, `a1 pi` preserves pinned Pi's
  terminal transcript one-for-one: the same lines, wording, punctuation,
  indentation, stdout/stderr routing, and dim/bold/green/red emphasis. The only
  intentional differences are the command namespace the user typed and package
  paths rooted in `~/.a1/agent`; subprocess facts such as package counts and timing
  remain whatever the A1-profile operation actually produced. A1 adds no wrapper
  summary and no restart advisory.

## Capabilities

### New Capabilities

- `extension-packages`: installing, removing, listing, and updating Pi extension
  packages in the A1 profile, and the isolation and reporting rules those
  operations follow.

### Modified Capabilities

- `launch-profiles`: the maintenance command set grows the package verbs, so the
  unknown-subcommand rule and the "not a profile name" rule cover them too.
- `cli-self-update`: `update` carries package targets alongside self-update, and
  refuses to self-update the pinned Pi.
