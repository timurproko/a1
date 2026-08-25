## Why

A development preview currently publishes after every merge to `develop` and uses
the source commit in its version, for example `0.1.8-dev.7eabe9e`. That makes the
three-platform package pipeline run for every commit and gives users a source hash
to copy when they want a particular preview.

Development previews should instead be deliberate checkpoints: one from the
nightly automation and one whenever a maintainer explicitly asks for one. Their
names should use the decimal number GitHub presents beside `develop` — for example,
`develop (#107)` should publish `0.1.8-dev.107` — so a user can install it with
`a1 update:107`.

## What Changes

- A push to `develop` no longer publishes a development preview by itself.
- The nightly automation remains scheduled at `03:17 UTC` and always runs complete
  verification for the current `develop` source, even when that source has not
  changed and its preview already exists. It publishes only when the corresponding
  numbered preview is absent; when it exists, nightly verifies the exact registry
  tarball instead of rebuilding immutable npm bytes.
- The maintainer command `npm run develop` requests publication for the current
  `develop` source and waits for GitHub Actions to report the published version. If
  that numbered preview already exists, the command completes successfully and
  reports it without building or publishing it again.
- `npm run develop` requests the authoritative GitHub Actions publication; it does
  not build or upload npm bytes from the workstation.
- A preview is versioned `<major.minor.patch>-dev.<pull-request number>` rather than
  `-dev.<short commit>`. The number is the unique merged pull request associated
  with the selected `develop` commit, matching the `develop (#107)` presentation
  in the supplied GitHub deployment history.
- A nightly workflow run does not itself have a pull request. It selects the current
  `develop` head and resolves the merged pull request that produced that commit.
  Under the protected-branch workflow, the nightly build therefore follows the
  latest merged pull request number.
- `a1 update:<number>` resolves and installs that numbered preview.
  `a1 update:develop` installs the current development preview, and the full preview
  version remains an accepted exact name. The old public spelling
  `a1 update:next` is removed.
- User-visible development-channel terminology is consistently `develop`: update
  progress says `a1 update` without a channel label and `a1 version` labels the remote preview
  `Develop`, never `Next`. The underlying npm `next` dist-tag remains an internal
  registry convention unless a separate tag migration is approved.
- The README and release runbook replace per-commit automatic-preview instructions
  and hash examples with the nightly/manual workflow, `npm run develop`, and a
  numbered example such as `a1 update:107`.
- Stable releases keep their existing package validation, npm `latest`, tag,
  GitHub Release, and `master` recording guarantees. `npm run release` explicitly
  dispatches stable publication after its version pull request merges and waits for
  the result; a push does not publish either channel.

Nightly verification and development publication are deliberately separate
outcomes. A repeated nightly run is not a no-op: it still performs the complete
suite against the package npm actually serves. Only its publication phase is an
idempotent no-op when npm already contains the immutable numbered preview. A
repeated `npm run develop` may stop as soon as GitHub Actions proves that same
preview already exists.

Manual, nightly, and stable publication share one exact-byte candidate and
publication implementation, but retain separate entry points and validation scopes.
The final registry check and publish operation are serialized, so overlapping
manual and nightly requests produce at most one publication; the other request
finishes successfully without changing npm.

## Capabilities

### Modified Capabilities

- `continuous-integration`: publish development previews nightly or by explicit
  maintainer request, and name them with a decimal development number.
- `cli-self-update`: install a numbered development preview through
  `a1 update:<number>` and name the development channel `develop` publicly.
- `a1-shell`: replace `update:next` and `Next` presentation with
  `update:develop` and `Develop`.
- `launch-profiles`: keep the renamed development update command outside
  interactive profile dispatch.
