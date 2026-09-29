## Why

Stable publication currently asks the maintainer to choose **Save draft** to start npm staging and to avoid GitHub's primary **Publish release** button until the terminal reports npm ready. The primary action is a trap, the real trigger is hidden in a secondary button, and the release command must stay open and poll the draft. Most npm projects publish when the GitHub Release is published; A1 should follow that model so the one obvious button does the one obvious thing.

## What Changes

- **BREAKING**: `npm run release -- <patch|minor|major|x.y.z>` creates the source-bound draft with the generated changelog, starts validation of that source in CI, prints the draft URL, and exits. It no longer waits for **Save draft**, polls the draft, or dispatches staging.
- **BREAKING**: choosing native **Publish release** on the reviewed draft starts stable publication. The `release.published` workflow packs the packages with the published note, validates the exact bytes, publishes both packages to npm `latest` with provenance, verifies the published pair, uploads the validated asset, fast-forwards `master`, and prepares the manually merged reopening pull request.
- When publication fails before either package reaches npm, the workflow returns the Release to draft and deletes the unconsumed tag, so the maintainer can fix and publish again. After a package reaches npm, recovery reruns the failed jobs of the same run; the Release and tag stay.
- Remove the Save-draft handshake, the `a1-stable-release-reviewed` repository dispatch, `approve-release.yml`, and the pre-publication staging receipt.
- Preserve authorized-human checks, source and version derivation from trusted code, exact-byte publication, provenance, retry safety, manually merged reopening, the packaged startup note, and both changelog orderings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Stable publication starts from native Release publication instead of a saved draft; a stable Release and tag may briefly precede npm, with automatic return to draft when publication fails before npm.

## Impact

This changes the release command lifecycle, the stable publication trigger and ordering, the tag policy for unconsumed tags, the `publish.yml`/`finalize-release.yml`/`approve-release.yml` workflows, release tests, repository governance declarations, and the CI release runbook. Nightly development publication and `npm run develop` are unchanged.
