## Why

The release tag was the trigger, so it had to exist before anything was validated.
When the `v0.1.2` release failed on Linux and macOS, npm got nothing and no release
page appeared — but the tag stayed, advertising a version that does not exist.

Deleting it afterwards is not available: a release tag is never moved or removed,
and it is protected from both. So the only honest fix is to stop creating the tag
until there is something to name.

## What Changes

- The pipeline is triggered by pushes to `develop` alone. What the pushed commit
  declares decides the channel: a prerelease version publishes a preview, a stable
  version publishes the release.
- The tag, the GitHub Release, and `master` are all written after the registry
  serves the package. A release that fails leaves no tag, no release, and no moved
  branch — only a red run.
- The GitHub Release is no longer staged as a draft first. It has nothing to protect
  against once it is created after publication, and it attaches to the tag the
  publication just wrote.
- `npm run release` creates no tag. It lands the stable version, waits for that
  publication to succeed, and only then opens the next prerelease — so the command
  fails when the release fails, rather than reporting success over a red run.

## Capabilities

### Modified Capabilities

- `continuous-integration`: what publishes is a commit declaring a stable version
  rather than a pushed tag, and every record of a release is written after the
  registry has it.
