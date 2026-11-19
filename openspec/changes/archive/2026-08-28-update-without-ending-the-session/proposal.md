## Why

Updating A1 ends whatever A1 is doing. A session that had been working for twenty-four
minutes was stopped mid-turn by an `a1 update:next` run in another terminal tab; the shell
prompt returned underneath a still-drawn interface, with no statement of what had happened.
Vanilla Pi in the next tab keeps working when Pi is updated, because updating Pi is an npm
install and nothing asks the running process to leave.

A1 asks. `shutdownVerifiedOwners` sends every live instance a stop request through the
supervisor — `#drainInstances("update", …)` in `supervision/server.ts` — and force-terminates
the owner through `cleanupVerifiedOwner({ allowLiveInstances: true })` when the drain does not
complete. The launch path already refuses to take ownership from a cohort with live instances
and answers "launch instances are still active"; only update overrides that.

The reason it overrides it is structural rather than intentional. Endpoint identity is scoped
to the runtime directory, not to the release: the pipe or socket name is derived from the
runtime directory alone and the metadata is a single file in it. Two live cohorts cannot
coexist because they would contend for one endpoint, so replacing the active cohort means
ending the one that holds it — including the work inside it.

The release model is otherwise ready for this. Each release is already materialized into its
own immutable root, and a live cohort already runs from that root rather than from the mutable
npm package. An installation replaces files the running session no longer reads. What stands
in the way is one name.

## What Changes

- Endpoint identity becomes cohort-scoped, so a second live cohort is addressable rather than
  in contention. The active reference already recorded in cohort state is what a new launch
  follows.
- An update leaves a live cohort running. It installs, materializes, certifies, and commits the
  new active reference; sessions that are working keep working, on the release they started on,
  and the next launch starts on the new one.
- A cohort that is no longer the active one retires itself when its last instance exits, taking
  its own endpoint artifacts with it.
- A live cohort running from the mutable installation is still ended, because its files are
  what the installation replaces — and it says so rather than disappearing.
- Reconciliation, rollback, and retained-release pruning each account for more than one live
  cohort: a release a live cohort runs from is never pruned, and rollback re-points the active
  reference without disturbing a cohort that survived.

## Capabilities

### Modified Capabilities

- `agent-supervision`: an update coordinates ownership by moving the active reference rather
  than by ending live cohorts, endpoint identity is per cohort, and a superseded cohort retires
  when its work finishes.
- `cli-self-update`: replacement no longer requires that nothing is running, and the one case
  that still ends a session states why.
