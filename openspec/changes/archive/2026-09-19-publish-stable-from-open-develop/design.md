# Design

## Context

`release.yml` resolves the version from the checked-out `package.json`: a development request derives `x.y.z-dev.<pr>` and stamps it with `npm version --no-git-tag-version` before `npm pack`; a stable request required `package.json` to already declare `x.y.z`. Getting that declaration onto protected `develop` is the first of two version PRs the helper prepares, and it is the fragile one: it sits in ordinary PR validation while `develop` advances underneath it, and the helper correctly refuses to publish anything but the commit it prepared.

## Decision

Treat the stable version like the preview version: named at dispatch time, stamped on the runner, never committed.

- `workflow_dispatch` gains an optional `version` input. The `source` job requires it (final `x.y.z`) for the stable channel and rejects it for the develop channel. The `plan` job requires the source's `package.json` to declare `x.y.z-dev` on every channel and, for stable, requires the requested version to be at or above the open version's core so a release can never sort below the previews built before it.
- The stamp step runs for every built candidate. The `Bind packed source and identity` check that the packed manifest declares the resolved version is unchanged and now also covers stable.
- The tag, GitHub Release, and `master` still name the source commit. That commit's `package.json` says `0.1.8-dev`; the tarball says `0.1.8`. The reproduction recipe is `git checkout v0.1.8 && npm version 0.1.8 --no-git-tag-version && npm pack`, and the candidate identity artifact continues to bind the source tree, the packed version, and the digests.
- `dispatchPublication("stable", source, version)` passes `-f version=<x.y.z>`; development dispatches are byte-for-byte unchanged.
- `runRelease` drops the stable-version phase and the prepared-source verification. Order: registry and tag guards, re-read authoritative `develop` (the guards are asynchronous), dispatch and wait, then `prepareVersion` for the reopening PR from the then-current `develop`, which must still declare the open version the release was cut from. A `develop` declaring anything other than `x.y.z-dev` is refused before any Git call. `resolveReleasePlan` keeps its prerelease-aware arithmetic; the stable-current row in the docs goes away because that state no longer exists.

## Alternatives

- Give the workflow a write identity that bypasses `develop` protection and commits both bumps itself: zero PRs, but an automated actor past branch protection, which the governance spec deliberately avoids.
- Publish from the reopening PR's merge-base after the reopening merges: still one PR, but the published commit is then behind `develop` by the time anything is verified, and the helper would have to wait for a merge before publishing at all.

## Risks

- A maintainer who expects the tagged commit's `package.json` to read `0.1.8` will find `0.1.8-dev`; the runbook states the recipe. Nothing in the repository reads the version from a tag.
- If publication succeeds and the reopening PR stalls, the helper cannot be rerun for the same version (the guards refuse it); the runbook says to merge or repair the reported PR by hand.
