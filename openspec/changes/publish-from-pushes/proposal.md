## Why

Publishing a preview took a command that dispatched two workflows and waited on
them. Publishing a stable release took five manual dispatches, a promotion branch,
and physical certification on three self-hosted workers.

There are no self-hosted workers. There never have been in this repository, so the
`master` ruleset requires a check that only a workflow gated to `develop` can
produce, which means `master` cannot be merged into and stable cannot be published
at all. A gate nobody can pass is not a gate; it is a stop.

The rest of the ceremony has the same shape for a different reason. A preview costs
a commit that says nothing but a number, and it costs a person deciding to run a
command. Neither decision carries information: every green `develop` commit is a
preview anyone would want published.

What is worth keeping from all of it is the part nobody notices: the package is
packed once, validated on every platform, and the publisher uploads exactly those
bytes without rebuilding. That property survives here unchanged.

## What Changes

- One workflow publishes both channels, triggered by pushes rather than dispatched.
  A push to `develop` publishes a preview to npm `next`; a pushed `v<version>` tag
  publishes that version to npm `latest` and records its GitHub Release.
- A preview version is stamped at publish time as
  `<major.minor.patch>-dev.<run number>` and never written back, so previews cost no
  commits and need no decisions.
- `npm run release -- <patch|minor|major|x.y.z>` is the only release command. It
  lands the version on `develop`, tags it, pushes the tag, and reopens `develop` at
  the next `-dev.0`. The tag is what publishes.
- The stable GitHub Release is staged as a draft before npm is contacted and
  published only after npm accepted the bytes; a failure removes the draft.
- `master` stops being a promotion target and becomes a record: a completed stable
  publication fast-forwards it to the commit it published, so `master` always names
  what npm `latest` serves. It carries no check and no pull-request requirement,
  because only the release writes it. Release tags are likewise protected from
  deletion and movement.
- Physical certification stops gating publication. It never ran, and holding
  releases for evidence no machine produces protects nothing.

**BREAKING**: `npm run release:next` and `npm run publish:next` are gone, as are the
`preview-candidate`, `npm-publish`, `stable-candidate`, `certify-stable`,
`stable-physical-certification`, and `publish-stable` workflows.

## Capabilities

### Modified Capabilities

- `continuous-integration`: publication follows from what was pushed rather than
  from a chain of dispatches, `master` records the published commit rather than
  gating it, and release tags are protected from deletion and movement.
- `isolated-regression-testing`: physical evidence governs what A1 may claim about
  terminal parity and platform support, and no longer governs whether a version may
  be published.
