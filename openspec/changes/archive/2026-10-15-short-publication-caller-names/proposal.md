## Why

GitHub prefixes every job of a called reusable workflow with the caller job's name. The three publication callers use long sentences, so each `publish.yml` job is listed as, for example, `Validate and publish development packages / Build process guardian (macos-15)`. That prefix repeats on every row of `gh run watch`, the Actions sidebar, and the check list.

## What Changes

- Rename the caller job in `.github/workflows/develop.yml` to `Develop`.
- Rename the caller job in `.github/workflows/release-candidate.yml` to `Candidate`.
- Rename the caller job in `.github/workflows/release.yml` to `Release`.
- Keep job ids, inputs, secrets, permissions, conditions, and the called `publish.yml` unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Only the display names of the publication caller jobs change.

## Impact

Only the three caller workflows change, plus a focused governance assertion that pins the short caller names. Nothing in the repository references the old display names; scripts and aggregation use job ids.
