# CI and release operations

GitHub Actions is the only automation platform. Three refs are protected:

| Ref | Protection | Produced by |
| --- | --- | --- |
| `develop` | `Development validation required` on every pull request | `.github/workflows/ci.yml` |
| `master` | cannot be deleted or force-updated | ruleset only |
| `refs/tags/v*` | cannot be deleted or moved | ruleset only |

Publishing is one workflow, `.github/workflows/release.yml`, triggered by pushes
rather than dispatched by hand.

`develop` is where work lands. `master` records what the npm `latest` tag serves:
the release fast-forwards it to the commit it published, and nothing else ever
writes it. There is no promotion to arrange and nothing to keep in sync — `master`
is an effect of publishing, not a step before it.

## How much validation runs when

| Change | Validation |
| --- | --- |
| Docs or specs only | OpenSpec strict lint, nothing else |
| Any code PR into `develop` | Fast tier: typecheck, architecture checks, unit/contract tests |
| Preview publish (`next`) | Fast tier + package gates on Windows, Linux, and macOS |
| Stable publish (`latest`) | Complete suite on Windows, Linux, and macOS |

Need more coverage for something risky? Run the **Full regression** workflow on
demand.

## Previews publish themselves

Every push to `develop` publishes a preview to the npm `next` tag. Nothing to
dispatch and nothing to approve.

The version is stamped at publish time — `<major.minor.patch>-dev.<short commit>`,
the base taken from whatever `package.json` declares and the suffix from the commit
being published — and is never written back to the repository. An installed preview
therefore names the exact source it came from, and rebuilding a commit produces the
same version rather than a new one. That suffix is also how a specific preview is
installed: `a1 update:<commit>` resolves it against the published list and
refuses a commit that was never published. `develop` therefore carries one open prerelease version between
releases, and no commit is ever spent on a preview.

One consequence worth knowing: a push that would republish an existing version
fails early, before anything is packed.

## Cutting a stable release

One command, from a clean `develop` that matches its remote:

```sh
npm run release -- patch     # or minor, major, or an exact x.y.z
```

It lands `x.y.z` on `develop` through a pull request that merges itself, waits for
that publication to succeed, and then lands `x.y.(z+1)-dev.0` so previews resume
immediately. It publishes nothing itself and creates no tag.

Landing the stable version is what publishes. The same pipeline sees a commit
declaring a stable version and runs its stable form: build the process guardian on
all three platforms, pack once, run the complete suite against those exact bytes on
all three platforms, publish to npm `latest` with provenance from the
`npm-publish` environment, and only then write the tag `vx.y.z`, record the GitHub
Release, and fast-forward `master`.

That order is the point. A release that fails leaves no tag, no release, and no
moved branch — only a red run. Nothing ever advertises a version that does not
exist on the registry.

Rules that do not bend:

- **Never upload locally rebuilt bytes.** The publisher uploads the artifact the
  validation ran against, and re-checks its digest before and after.
- **Never route around validation by rebuilding inside a publisher.** The publish
  job has no checkout of dependencies, no build, and no pack step.
- **Never move a release tag.** A wrong tag is superseded by the next version, not
  repointed. The tag is written by the publication itself, so it exists only for
  versions that shipped.

## When something fails

- **PR validation fails:** fix the code and push. Do not mark a failed tier optional.
- **Preview publish fails:** fix and push again; the next push publishes the next
  run number. Nothing needs cleaning up.
- **Stable publish fails:** nothing was recorded — no tag, no release, no moved
  branch. Fix the cause and release the next version. The failed version number is
  spent, because `develop` has already moved past it.
- **Stable publish is uncertain after npm accepted the bytes:** stop. Check the
  registry for the version, tag, and digest. Repair a dist-tag only as a separate
  reviewed operation — never republish.

## Why the ruleset looks the way it does

One person maintains this repository, and GitHub does not let a PR author approve
their own PR. Requiring even one approval would deadlock the authorized
solo-maintainer path — no PR could ever merge. So the `develop` ruleset requires a
pull request, a green required check, and resolved review threads, but sets required
approving reviews to zero. It does not require the branch to be up to date: once a
PR is green it merges even if unrelated work landed first, with no re-validation
loop.

The `master` and tag rulesets carry no checks at all. Both only ever receive a commit
that has already been validated and published, so what matters about them is that
neither can be rewritten. Requiring a pull request on `master` would stop the release
from recording itself there.

Do not add a direct-push bypass as a shortcut, and never weaken the force-push or
deletion protection. Ruleset mutation is a separate administrative operation: run
`node scripts/check-github-rulesets.mjs` to see the diff, and apply only when a
maintainer explicitly confirms with `--apply --confirm apply-a1-ci-rulesets`.
