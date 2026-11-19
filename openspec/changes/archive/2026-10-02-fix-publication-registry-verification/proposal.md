## Why

Development publication run `36908820486` successfully provenance-published both `0.2.3-dev.657` packages, but its post-upload verifier polled each package's complete registry metadata document for ten minutes and never saw the new application version. The exact immutable versions and both `next` tags later resolved with the validated digests, and rerunning the same run passed without republishing. npm serves the exact-version, dist-tag, and complete package-metadata resources through independently cached paths; requiring the complete metadata document to enumerate a just-published version creates a false publication failure after irreversible uploads.

## What Changes

- Verify each published package through its identity-specific exact-version registry resource rather than requiring the package-wide metadata document to contain the new version.
- Verify `latest` or `next` through npm's dedicated dist-tag resource for that package.
- Preserve exact integrity/shasum comparison, package/version identity checks, the existing ten-minute bounded polling window, immutable no-op reruns, and post-publication smoke gates.
- Add deterministic tests proving stale package-wide metadata cannot cause failure when exact-version and dist-tag resources serve the validated publication, while absent or mismatched exact resources still fail closed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Make post-publication verification use npm's identity-specific version and dist-tag resources without weakening exact-byte or requested-tag checks.

## Impact

The change affects the reusable npm publication workflow, a focused release verification helper, and repository-governance tests. It does not change package construction, validation breadth, trusted publishing, provenance, publication order, polling duration, retry count, stable release mutation, post-publication smoke, or npm package identities. No dependency or migration is introduced.
