## Why

A preview was numbered by the release workflow's run counter, so the first preview
of `0.1.5` published as `0.1.5-dev.11` — eleven being the number of times that
workflow had run, most of them failures from the afternoon it was written.

The number says nothing. It does not identify the code, does not say how far along
the line is, and jumps whenever a run fails. Worse, it is a property of the run
rather than of the commit: re-running a job would mint a different version for
identical bytes.

## What Changes

- A preview is named after the commit it was built from: `0.1.5-dev.ea0394c`.
  Reading an installed preview tells you exactly which source produced it.
- The same commit always produces the same version, so a rebuild cannot invent a
  new version for bytes that already shipped — the republish guard refuses it,
  which is the correct answer.
- Nothing else changes: previews still cost no commits, and stable versions are
  still the plain version the repository declares.

Ordering is the one property given up. Prerelease identifiers compare
lexically, so `-dev.ea0394c` does not sort after `-dev.4f21bb0`. Nothing reads
that ordering: `a1 update:next` installs whatever the `next` dist-tag names, and
npm resolves a tag rather than a range.

## Capabilities

### Modified Capabilities

- `continuous-integration`: a preview version identifies its commit rather than
  counting workflow runs.
