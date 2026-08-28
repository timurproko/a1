# CI and release operations

GitHub Actions is the only automation platform. Three refs are protected:

| Ref | Protection | Produced by |
| --- | --- | --- |
| `develop` | `Development validation required` on every pull request | `.github/workflows/ci.yml` |
| `master` | cannot be deleted or force-updated | stable publication |
| `refs/tags/v*` | cannot be deleted or moved | stable publication |

`.github/workflows/release.yml` is the only publisher. A push publishes neither
channel. The workflow starts at `03:17 UTC` for nightly development verification,
or by explicit dispatch from `npm run develop` or `npm run release`.

`develop` is where work lands. `master` records what npm `latest` serves and is an
effect of stable publication, not a trigger.

## Validation by trigger

| Trigger | Validation and outcome |
| --- | --- |
| Pull request into `develop` | Fast required validation; docs/spec-only changes use strict OpenSpec validation |
| `npm run develop` | Preview package gates on Windows, Linux, and macOS; an existing numbered preview is an early successful no-op |
| Nightly at `03:17 UTC` | Complete non-physical suite on Windows, Linux, and macOS, every night |
| `npm run release -- ...` | Complete exact-byte stable gates, then npm `latest`, tag, GitHub Release, and `master` |
| `.github/workflows/full-regression.yml` | Additional on-demand complete regression without publication authority |

## Numbered development previews

A merge or push to `develop` does not publish by itself. To request a deliberate
preview from any authorized checkout:

```sh
npm run develop
```

The command fetches authoritative `origin/develop`, resolves the unique merged pull
request associated with that exact commit through GitHub, and derives
`<major.minor.patch>-dev.<pull-request number>`. Thus GitHub's `develop (#107)`
source produces `0.1.8-dev.107`. It first checks npm; if the immutable version
already exists it reports that version without dispatching package work. Otherwise
it dispatches GitHub Actions, waits, and reports the published version. It never
builds or uploads npm bytes from the workstation.

Nightly resolves the same current `origin/develop` source. It always runs complete
verification even if source has not changed. For a new number it packs once and
runs the suite against that final-version tarball before publication. For an
existing number it downloads the exact npm tarball and runs package/update gates
against those registry bytes; publication is then a successful no-op.

Manual and nightly runs share one non-cancelling concurrency group. Their final
registry check is serialized, so overlapping requests can produce only one publish
and one successful existing-version no-op. A development publication moves npm's
internal `next` dist-tag and never moves `latest`.

Users install previews with public `develop` terminology:

```sh
a1 update --develop                     # current development channel
a1 update --develop 107                 # numbered preview
a1 update --develop 0.1.8-dev.107       # exact full preview version
```

The former `a1 update:<selector>` commands are removed without compatibility
aliases or redirects. Unsupported forms exit quietly without registry or runtime
work.

## Cutting a stable release

From a clean `develop` matching its remote:

```sh
npm run release -- patch     # or minor, major, or an exact x.y.z
```

The command lands `x.y.z` through its version pull request, explicitly dispatches
stable publication for that exact current `origin/develop` commit, and waits. Only
after success does it land `x.y.(z+1)-dev`.

Stable publication builds the process guardian on all supported platforms, packs
once, runs the complete suite against those exact bytes on Windows, Linux, and
macOS, publishes to npm `latest` with provenance from the `npm-publish`
environment, and then writes `vx.y.z`, records the GitHub Release, and fast-forwards
`master`. A push of the stable version does not publish it.

Rules that do not bend:

- **Never upload locally rebuilt bytes.** The publisher uploads the artifact the validation ran against and checks its digest before and after.
- **Never route around validation by rebuilding inside a publisher.** The publish job receives the packed artifact and does not install dependencies, build, or pack.
- **Never move a release tag.** A wrong tag is superseded by the next version, not repointed.

## When something fails

- **PR validation fails:** fix the code and push; do not mark a failed tier optional.
- **Development publication fails:** fix the cause and rerun `npm run develop`; an npm version that already exists is never overwritten.
- **Stable publication fails before npm accepts bytes:** no tag, release, or moved branch exists. Fix the cause and release the next version.
- **Stable publication is uncertain after npm accepted bytes:** stop and inspect registry version, digest, tag, and release. Never republish immutable bytes.

## Branch protection rationale

One person maintains this repository, and a PR author cannot approve their own PR.
The `develop` ruleset therefore requires a pull request, a green required check,
and resolved review threads, but zero approving reviews. `master` and release tags
are written only after publication and are protected from force-push, movement, and
deletion.

Do not add direct-push bypasses. Ruleset mutation remains a separate administrative
operation: inspect with `node scripts/governance/check-github-rulesets.mjs`, and apply only
with explicit maintainer confirmation.
