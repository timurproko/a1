## Context

The publisher performs a final exact-version check before upload, provenance-publishes any missing immutable package, then verifies both registry identities and the selected dist-tag before permitting published-pair smoke or stable release completion. The post-upload verifier currently fetches `https://registry.npmjs.org/<encoded-package>` and looks for the version in its `versions` map and the tag in its `dist-tags` map.

For `0.2.3-dev.657`, npm acknowledged both uploads and emitted provenance records. The complete application metadata response remained stale for all 60 checks over ten minutes, so the workflow failed with `@timurproko/a1@0.2.3-dev.657 has not propagated`. npm later served both exact versions with the expected integrity/shasum and both `next` tags. Attempt 2 verified those bytes, skipped both immutable uploads, exercised the published pair on Windows, Linux, and macOS, and succeeded. The failure was therefore resource-level metadata lag, not missing or incorrect publication.

npm exposes identity-specific resources for both facts the gate needs: `/<encoded-package>/<exact-version>` returns one version manifest, and `/-/package/<encoded-package>/dist-tags` returns the package's tag map. Neither verification requires the much larger package-wide metadata document to enumerate all versions.

## Goals / Non-Goals

**Goals:**
- Verify each published identity and exact digest through npm's exact-version resource.
- Verify the requested channel through npm's dedicated dist-tag resource.
- Preserve bounded polling, fail-closed digest and identity checks, immutable rerun behavior, and publication ordering.
- Make the registry protocol deterministic and independently testable outside inline workflow shell code.

**Non-Goals:**
- Increase polling attempts, polling interval, job timeout, or retry the npm upload.
- Treat npm's successful upload exit as sufficient registry verification.
- Skip dist-tag verification or accept a different version under the requested tag.
- Republish an existing version, move stable state early, or weaken post-publication native smoke.
- Work around a genuinely absent version or mismatched registry bytes.

## Decisions

### 1. Verify the exact resources that authorize continuation

For each package, request `/<encoded-package>/<encoded-version>` with cache-bypass query/header values. Require HTTP success, exact package name, exact version, and exact `dist.integrity` and `dist.shasum`. For `latest` and `next`, separately request `/-/package/<encoded-package>/dist-tags` and require the selected tag to equal the exact version.

A 404, non-success response, malformed response, identity mismatch, digest mismatch, or tag mismatch remains a failed attempt. The pair succeeds only in one attempt where both package identities and tags verify.

Alternative: continue reading the complete metadata document but change cache headers or query strings. Rejected because the failed run already supplied both and still observed the stale `versions` map for ten minutes.

Alternative: use only `npm view`. Rejected because it obscures which registry resource supplied each fact and is harder to exercise deterministically; npm configuration is already fixed to the public registry in this trusted job.

### 2. Preserve the existing bounded ingestion allowance

Keep exactly 60 attempts at ten-second intervals. The defect is selecting an unnecessarily stale resource, not insufficient patience. Log one bounded reason per failed attempt and throw the last error after the existing window.

Digest or identity mismatches are polled rather than immediately terminal, preserving existing behavior during partial cache propagation. They still cannot pass unless exact validated values appear within the bound.

### 3. Move protocol logic into a focused release helper

Add one dependency-free release helper that accepts package descriptors, version, channel, and injectable fetch/sleep/clock/report seams. Its command entry reads authoritative package names plus expected digests from the workflow environment. The reusable workflow invokes the helper instead of embedding the polling implementation.

Unit tests simulate independently cached resources: a stale package-wide document is never requested, exact-version and dist-tag resources can become ready independently, exact identities/digests/tags are required, and exhaustion fails. Focused workflow policy requires the helper and fixed bound and rejects restoring package-wide verification.

## Risks / Trade-offs

- **[Exact-version data appears before the tag]** → Verify both in every bounded attempt and continue until the requested tag also matches.
- **[One package propagates before the other]** → Require both package descriptors in the same successful attempt; immutable reruns continue to verify rather than republish existing bytes.
- **[A registry cache returns another identity/version]** → Validate manifest `name` and `version`, not only digest fields.
- **[Endpoint syntax drifts]** → Use npm's established encoded package paths and cover exact URLs in deterministic tests; any non-success response fails closed.
- **[Moving inline logic hides workflow policy]** → Keep workflow-level governance assertions for the helper invocation, environment bindings, fixed polling constants, and absence of package-wide post-upload lookup.

## Implementation Evidence

- Run `36908820486` attempt 1 provenance-published both packages, then observed the stale application package-wide `versions` map on all 60 checks. Registry inspection later returned both exact versions, expected integrity/shasum values, and `next` tags. Attempt 2 skipped both upload steps, verified the existing bytes, passed published-pair smoke on Windows, Linux, and macOS, and completed successfully.
- Nine deterministic helper tests prove exact-version and dedicated dist-tag URLs, independent convergence within the unchanged bound, exact identity/version/digest/tag checks, malformed/absent response rejection, and pre-network authority validation. The focused publication policy suite requires the helper, constants `60` and `10_000`, both endpoint forms, and absence of the package-wide `metadata.versions` lookup.
- Seven focused publication/governance files passed 79 tests. Fast validation passed 315 tests; build, source/bin typecheck, architecture boundaries, product identity, naming audit, strict OpenSpec validation, and diff checks passed.
- A no-upload invocation of the new command verified the already-published `@timurproko/a1@0.2.3-dev.657` and `@timurproko/a1-install@0.2.3-dev.657` identities using the attempt-1 recorded integrity/shasum values and dedicated `next` tags.
- No polling attempt, interval, timeout, upload retry, publication permission, package ordering, or post-publication smoke requirement changed.

## Migration Plan

1. Add and test the identity-specific registry verification helper.
2. Replace only the post-upload inline verifier in the reusable publisher; retain the pre-upload exact-version check and all job dependencies.
3. Run the helper against `0.2.3-dev.657` with its recorded application and installer digests and `next` tag.
4. Ship through the normal development publication path. A later candidate must pass exact registry verification and published-pair smoke without relying on package-wide metadata freshness.
5. Roll back by restoring the inline verifier; no registry or package state migration is involved.
