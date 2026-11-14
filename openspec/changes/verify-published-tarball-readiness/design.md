# Design

## Context

The post-upload verifier reads exact-version manifests and dedicated dist-tags but never downloads dist.tarball. In run 43634036658 metadata readiness preceded application tarball availability. The smoke harness throws a concise installer error and deletes its temporary prefix before writing any evidence.

## Decisions

1. Keep the existing 180-attempt, ten-second ingestion interval and exact-resource checks. Require an HTTPS registry.npmjs.org tarball URL without credentials or fragments, disable redirects, stream each response into SHA-512 and SHA-1 hashes, and compare both with validated artifact digests. Bound requests and tarball bytes so a stalled or oversized response cannot hold the gate indefinitely. Do not rebuild, unpack, execute, or republish downloaded bytes.
2. Keep plain installer invocation and exact successful transcript assertions. Collect bounded npm debug diagnostics only from a cache isolated beneath the smoke fixture. On failure, write structured sanitized evidence including the failing stage and available child exit/error diagnostics before fixture cleanup; never mark failure evidence as successful activation. Do not retry installations or use verbose mode to alter the transcript contract.
3. Exercise the harness through injected process/filesystem boundaries in focused tests, without network access or product activation. Preserve the existing CLI entry and workflow artifact pattern.

## Validation scope

Focused registry and smoke tests cover delayed tarball availability, digest mismatches, rejected URLs, stalled/oversized downloads, failure evidence redaction, acquisition/install/activation-command failures, cleanup, and unchanged success assertions. Run typecheck and strict OpenSpec validation; do not run broad suites or dispatch publication.

## Known gaps

No live nightly recovery or cross-platform installed-product certification is claimed by local fixtures. Native smoke remains authoritative after publication. Registry readiness at one point cannot guarantee perpetual availability from every npm edge; this gate prevents metadata-only success and retains diagnostic evidence for later failures.
