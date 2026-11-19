# Change: Recover npm publication from duplicate transparency-log entries

## Why

npm trusted publishing can successfully authenticate and validate a package, then fail before registry publication when Sigstore returns `TLOG_CREATE_ENTRY_ERROR` with an equivalent transparency-log entry. The current workflow treats that transient provenance failure as final even though the exact validated package remains unpublished.

## What Changes

- Add a bounded publisher for exact validated tarballs that recognizes only the duplicate transparency-log failure.
- Recheck npm for the exact expected package bytes before retrying, then retry the same tarball with provenance and trusted publishing.
- Keep all other publication failures, mismatched registry bytes, retry exhaustion, pair ordering, and final registry verification fail-closed.
- Add regression coverage and workflow governance for the recovery path.

## Impact

- Affected spec: `continuous-integration`
- Affected code: npm publication workflow, release publication helper, and repository-governance tests
