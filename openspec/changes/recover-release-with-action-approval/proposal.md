## Why

The first live draft-Release attempt exposed an operator trap: GitHub's native **Publish release** button looks like approval but bypasses A1's npm workflow, leaving a public `v0.2.2` Release and tag with no packages. Stable approval should be one obvious GitHub Actions button, preparation should print each useful link once, and the exact partial record must be recoverable without deleting or moving its tag.

## What Changes

- **BREAKING**: replace the local stable `--approve` operation with an **Approve stable release** GitHub Actions dispatch that asks only for the stable version, derives all source/draft/digest authority inside trusted workflow code, keeps the Release as a draft through every package gate or failure, and publishes that same draft only after complete success.
- Make stable preparation generate a Pi-style `## [version] - YYYY-MM-DD` changelog with categorized `###` sections and print the editable draft URL exactly once plus the Actions approval URL exactly once, without duplicate created/ready messages or an instruction to run `--approve`.
- Move post-publication reopening into trusted automation so button-driven publication creates one manually merged next-development-and-note PR without requiring a waiting local release process.
- Add an explicit, authorized recovery path for the orphaned `v0.2.2` tag left after the premature Release was deleted: validate its immutable tagged source as an ancestor of current open `develop`, require the absent npm pair and last registry-backed stable baseline, recreate only an editable draft for that tagged source, and publish the reviewed exact packages without deleting, moving, or reinterpreting the tag.
- Retain npm-first ordering for normal drafts, exact snapshot/package/Release equality, authorized-human dispatch, immutable registry and tag guards, preview separation, startup notes, bare A1's newest-first `/changelog`, and `a1 pi`'s pinned oldest-first in-feed changelog with the latest release nearest the bottom.
- Make the disposable-Git release fixtures reliable under ordinary parallel local load while retaining bounded hang detection and all caller-work/reopening assertions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Replace local stable approval with a minimal trusted Actions dispatch, automate reopening, define bounded recovery of a prematurely public exact release, and make the operator-facing preparation output unambiguous.

## Impact

This affects stable release command syntax/output, GitHub Actions entry points and permissions, publication/recovery policy, post-publication PR creation, repository governance declarations, release fixtures and timeout budgets, and release documentation. The premature public Release database ID `398871347` was deleted during planning, but immutable tag `v0.2.2` remains at former authoritative source `694c8846ba1d96cb7048bde6eba84141d110e523`; documentation PR #620 first advanced `develop` to descendant `7c25be1f9549bbd66461fd687a5ee9f42888f893`, and UI PR #621 later advanced it to descendant `f11d40df1ab428d54fd8a0acbb0e374fd584ca23`, without changing the open `0.2.2-dev` version or package identities. npm `latest`, `master`, and `v0.2.1` remain `0.2.1` at `51e8492c2aac79f120c157bb8db36a29819a136e`, and both `0.2.2` package versions are absent. The corrective path must publish only the immutable tagged source, preserve the orphan tag without any deletion or movement command, and obtain a fresh reviewed draft body rather than infer authority from the deleted Release.
