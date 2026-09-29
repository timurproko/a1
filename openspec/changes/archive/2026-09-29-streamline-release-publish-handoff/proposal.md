## Why

The trusted **Approve stable release** workflow protects package and Release identity, but it makes the maintainer leave the editable Release, find Actions, and type the version a second time. The release command already knows the version, source, and draft, so it can wait for an explicit draft save, dispatch trusted staging itself, and report when npm is ready. The maintainer should review in the Release editor and use GitHub's native **Publish release** control only after npm succeeds.

## What Changes

- **BREAKING**: replace the version-entry **Approve stable release** operator step with a waiting release command that observes a fresh **Save draft**, dispatches a trusted default-branch staging workflow without another version entry, and follows that exact run to completion.
- Keep the reviewed Release body immutable through package construction, exact-byte validation, npm publication, asset upload, and `master` advancement while the Release remains draft and the target tag remains absent.
- Stop trusted staging after npm, assets, `master`, and a verifiable staging receipt succeed; then direct the maintainer back to the same Release page for GitHub's native **Publish release** button.
- Handle `release.published` only as a post-publication verifier and reopening trigger. It never publishes npm and refuses to repair identity disagreement by moving or recreating tags.
- Preserve authorized-human checks, source/version/body/package identity, retry safety, manually merged reopening, packaged startup notes, bare A1 newest-first history, and `a1 pi` oldest-first history.
- Document the unavoidable native-button boundary: publishing before staging reports ready can still create a public Release and tag without npm, so the command must make the safe handoff unmistakable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Coordinate reviewed draft saving, trusted npm staging, native final publication, post-publication verification, and reopening without Actions navigation or repeated version input.

## Impact

This changes the stable release command lifecycle, the trusted workflow entry point, publication completion ordering, post-publication event handling, release receipt evidence, repository governance declarations, release tests, and maintainer documentation. It does not publish or alter the pending stable version as part of this change. At planning time `v0.2.2` and both npm `0.2.2` packages are absent, npm `latest` and `master` remain on `0.2.1`, and no `v0.2.2` draft Release is present.
