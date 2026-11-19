## Why

A stable `a1 solo` invocation can execute a newer retained development release because ordinary launch selection never moves the shared active release backward. In `Notify` mode, startup currently derives the update channel from that selected runtime, so a user who launched the stable package can incorrectly receive a development update notice.

## What Changes

- Preserve the invoking installed package version as launch context when a current release is selected, independently of the immutable runtime version that ultimately executes.
- In `Notify` mode, use that invoking version as the update channel and comparison baseline: stable launchers inspect only `latest`, and development launchers inspect only `next`.
- Keep automatic update behavior based on the executing immutable release, and fall back to the executing version when no invocation-version context is available.
- Add focused coverage for stable and development notification routing when ordinary launch selection executes a release from the other channel.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-self-update`: Route startup availability notices by the invoking package channel rather than a different retained runtime channel.

## Impact

Neutral private launch context, bootstrap-to-UI composition wiring, startup release discovery inputs, and focused launch-context, release-check, bootstrap, and composition tests. Public commands, update modes, cache format, automatic-update selection, and notice presentation remain unchanged.
