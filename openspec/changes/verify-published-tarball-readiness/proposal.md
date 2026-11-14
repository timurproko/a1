# Verify published tarball readiness

## Why

Publication run 43634036658 uploaded both packages at 0.2.7-dev.1307, but all native published-pair smoke lanes failed. An isolated install reproduced an application tarball HTTP 404 while exact-version metadata already advertised the expected digests. The tarball later became available. Metadata-only verification admitted a pair that npm could not yet install, and smoke cleanup removed the underlying diagnostics.

## What Changes

- Download both exact registry tarballs and compute SHA-512 integrity and SHA-1 shasum before registry verification succeeds, retaining bounded ingestion polling.
- Preserve sanitized, bounded failure evidence from published-installer smoke without weakening its success transcript or changing installer behavior.

## Impact

- Capability: continuous-integration.
- Owners: release registry verification and published-installer smoke harness.
- No republishing, workflow dispatch, or merge is authorized by this change.
