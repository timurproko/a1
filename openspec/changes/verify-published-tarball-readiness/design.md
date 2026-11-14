# Design

## Context

The post-upload verifier reads exact-version manifests and dedicated dist-tags but never downloads dist.tarball. In run 43634036658 metadata readiness preceded application tarball availability. The smoke harness throws a concise installer error and deletes its temporary prefix before writing any evidence.

## Decisions

1. Keep the existing 180-attempt, ten-second ingestion interval and exact-resource checks. Require an HTTPS registry.npmjs.org tarball URL without credentials or fragments, disable redirects, stream each response into SHA-512 and SHA-1 hashes, and compare both with validated artifact digests. Bound requests and tarball bytes so a stalled or oversized response cannot hold the gate indefinitely. Do not rebuild, unpack, execute, or republish downloaded bytes.
2. Keep plain installer invocation and exact successful transcript assertions. Collect bounded npm debug diagnostics only from a cache isolated beneath the smoke fixture. On failure, write structured sanitized evidence including the failing stage and available child exit/error diagnostics before fixture cleanup; never mark failure evidence as successful activation. Do not retry installations or use verbose mode to alter the transcript contract.
3. Exercise the harness through injected process/filesystem boundaries in focused tests, without network access or product activation. Preserve the existing CLI entry and workflow artifact pattern.
4. Upload candidates under the non-user-facing `a1-staging` dist-tag. Keep registry byte verification independent of public-tag promotion; only a separate trusted job after all native smoke lanes may move `next` or `latest`. Reuse immutable bytes after failed smoke or promotion; never skip smoke merely because an exact version already exists. Trusted OIDC promotion must fail closed if the package publisher lacks dist-tag permission; no long-lived secret or permission bypass is introduced. Exact stable staging checks must not silently install the old `latest` version.
5. Retry Windows EPERM/EACCES/EBUSY atomic renames within a finite allowance, never delete the current journal or launcher before replacement. Journal notification failures after spawning the detached guardian must not make the parent abandon a still-mutating npm process. Always await the guardian's callable-launcher outcome before failure settlement, and preserve recovery authority when bookkeeping fails. No repair mutates another running session or silently removes user state.

## Validation scope

Focused registry and smoke tests cover delayed tarball availability, digest mismatches, rejected URLs, stalled/oversized downloads, failure evidence redaction, acquisition/install/activation-command failures, cleanup, and unchanged success assertions. Promotion tests cover unchanged public tags on failed smoke, exact staged target selection, partial promotion retry, and immutable workflow dependencies. Updater tests inject transient/persistent Windows rename failures and journal callback failures while a detached replacement continues. Run typecheck and strict OpenSpec validation; do not run broad suites or dispatch publication.

## Known gaps

No live nightly recovery or cross-platform installed-product certification is claimed by local fixtures. Native smoke remains authoritative after publication. Registry readiness at one point cannot guarantee perpetual availability from every npm edge; this gate prevents metadata-only success and retains diagnostic evidence for later failures.
