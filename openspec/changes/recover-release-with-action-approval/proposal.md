## Why

The first live draft-Release attempt exposed an operator trap: GitHub's native **Publish release** button looked like approval but bypassed A1's npm workflow, briefly creating a public `v0.2.2` Release and tag with no packages. Stable approval must be one obvious GitHub Actions button, failed workflow publication must remain both draft and untagged, and successful Release publication must create the tag without manual tag management.

## What Changes

- **BREAKING**: replace local stable `--approve` with an **Approve stable release** GitHub Actions dispatch that asks only for the stable version and derives actor, source, Release, body, and digest authority in trusted code.
- Generate Pi-style editable release Markdown and print the draft-editing URL exactly once plus the Actions approval URL exactly once.
- Keep the Release draft and target tag absent through validation, package, npm, asset, and `master` failures; publishing the approved draft is the final mutation and lets GitHub create the tag at the bound source.
- Move reopening into trusted automation that creates one exact, non-auto-merged next-development-and-note PR for manual merge.
- Preserve exact snapshot/package/Release equality, immutable registry guards, preview separation, startup notes, bare A1's newest-first `/changelog`, and `a1 pi`'s oldest-first in-feed changelog.
- Stabilize disposable-Git release fixtures with a finite Windows-appropriate hang budget without weakening assertions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Replace local stable approval with a minimal trusted Actions dispatch, couple tag creation to final Release publication, automate reopening, and make preparation output unambiguous.

## Impact

This changes stable release command output, GitHub Actions permissions and entry points, completion ordering, reopening automation, repository governance declarations, release fixtures, and release documentation. At the maintainer's explicit direction, the orphan `v0.2.2` tag formerly at `694c8846ba1d96cb7048bde6eba84141d110e523` was deleted on 2026-09-29 after temporarily disabling only the release-tag ruleset; that ruleset was immediately restored to active enforcement. No `v0.2.2` Release or npm package exists, `master` and npm `latest` remain on `0.2.1`, and current `develop` at `f11d40df1ab428d54fd8a0acbb0e374fd584ca23` still consistently declares `0.2.2-dev`. The next `0.2.2` attempt therefore follows the ordinary current-`develop` draft path.
