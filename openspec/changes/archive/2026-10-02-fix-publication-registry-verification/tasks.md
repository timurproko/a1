## 1. Establish the failed-resource boundary

- [x] 1.1 Record the first-attempt upload acknowledgements, 60 stale package-wide metadata observations, eventual exact application/installer identities and tags, and successful immutable rerun; verify no digest, provenance, or package-pair mismatch caused the failure.
- [x] 1.2 Add failing deterministic coverage for a stale package-wide document while exact-version and dedicated dist-tag resources serve the validated pair; add rejection cases for absent, malformed, wrong-identity, wrong-version, wrong-digest, and wrong-tag responses.

## 2. Verify identity-specific registry resources

- [x] 2.1 Implement a dependency-free bounded verifier for both exact package manifests and dedicated dist-tag maps, with fixed encoded paths and injectable network/time seams.
- [x] 2.2 Require exact package name, version, integrity, shasum, and requested channel for both packages; retain 60 ten-second attempts and fail with the final bounded diagnostic after exhaustion.
- [x] 2.3 Replace the post-upload package-wide metadata loop with the helper while preserving pre-upload serialization, trusted-publisher preflight, immutable upload conditions, stable completion order, and post-publication smoke.

## 3. Validate publication behavior

- [x] 3.1 Run focused helper and publication workflow policy tests, including immutable rerun/no-republish behavior and rejection of package-wide post-upload verification.
- [x] 3.2 Run build, source/bin typecheck, architecture boundaries, product-identity governance, strict OpenSpec validation, and diff checks.
- [x] 3.3 Verify the already-published `0.2.3-dev.657` pair through the new command using the recorded exact digests and `next` tag without uploading or moving registry state.
