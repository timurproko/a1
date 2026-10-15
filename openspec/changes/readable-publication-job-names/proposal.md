## Why

When a publication mode skips a matrix job, GitHub never expands that job's matrix and lists it under its raw name template. Development publications therefore show rows such as `Validate ${{ matrix.platform }} / ${{ matrix.shard }}` and `Reconstruct ${{ matrix.platform }}`, which look broken even though the skip is intended.

## What Changes

- Give every matrix job in `.github/workflows/publish.yml` a static, human-readable name that does not reference `matrix.*`.
- Rely on GitHub's automatic matrix suffix, `Name (value, ...)`, so expanded runs still identify each platform, Node version, and shard.
- Keep job ids, `needs`, conditions, matrices, steps, artifacts, and the publication aggregate unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Only the display names of publication workflow jobs change.

## Impact

Only `.github/workflows/publish.yml` changes, plus a focused governance assertion that keeps publication matrix job names free of `matrix.*` expressions. Job ids and required-check aggregation are unaffected.
