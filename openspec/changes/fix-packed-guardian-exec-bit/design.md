## Context

See proposal.md — Why. The mechanics behind the failure:

- `scripts/release/prepare-validation-package.mjs` is the single pack entry (release workflow, full-regression workflow, local validation tiers), and the release workflow's `Obtain exact package` job runs it on `windows-2025` after merging the three per-platform guardian build artifacts into `dist/native/`. Governance (`test/repository-governance/release-pipeline-policy.test.ts`) pins the workflow to pack through this script exactly once and forbids the publisher from repacking.
- NTFS cannot represent a posix executable bit, so `npm pack` on Windows records `dist/native/<platform>-<arch>/process-guardian*` as mode 0644. Verified against the failing candidate artifact and the last published preview `0.1.8-dev.226` — both store the guardian 0644.
- Release materialization maps source permissions onto its read-only payload policy (any execute bit → 0o500, none → 0o400), so the packed 0644 becomes a non-executable 0o400 helper, and posix containment spawns that path directly: `EACCES`.
- Each guardian binary ships beside a per-platform `manifest.json` with schema `a1-process-guardian-artifact-v1` declaring `platform`, `architecture`, `capability`, `artifact.filename`, `artifact.sha256`, and `artifact.size`. The runtime already verifies this contract (`verifyProcessGuardianArtifact`), so packing can trust it as the authority for which entries are built executables; executable mode does not by itself change an `unsupported` platform capability to `supported`.
- Post-merge run `34022380161` built exact candidate `0.1.8-dev.254` from `4e7901f3e0105ae5de6c54be49dc2728677a3f74`. Package construction, Linux Node 24, and Windows Node 24 passed, proving Linux no longer fails with `EACCES`. Darwin Node 24 still timed out before supervisor endpoint publication, and Windows Node 22 later exceeded the warm `a1 pi` startup budget; the publisher skipped and aggregate failed as required. Those are independent blockers tracked in `fix-darwin-packaged-supervisor-startup` and `reduce-post-update-cold-start`.

## Goals / Non-Goals

**Goals:**
- A tarball packed on any host records every bundled native process guardian with an executable mode.
- Executability is bound to the certified build bytes through the packed per-platform manifests; packing fails rather than marking unverified bytes executable.
- Package surface validation proves guardian executability host-independently, so Windows pull-request CI catches a regression before merge.
- The pack-once / validate-exact / publish-verified-bytes chain and its governance keep their current shape.

**Non-Goals:**
- No change to release materialization's read-only payload policy, the containment spawn contract, or the guardian artifact manifest schema.
- No new posix lane in pull-request CI; release validation remains the posix end-to-end gate, now backed by a host-independent surface assertion.
- No implementation of an otherwise unsupported platform's containment provider and no change to startup performance budgets; those remain separate changes even though all must pass before publication.
- No republication or repair of already-blocked previews (`0.1.8-dev.249`); the next merged commit derives a fresh preview number as usual.

## Decisions

### Repair tar entry modes after `npm pack`, inside `prepare-validation-package.mjs`

After `npm pack` produces the tarball and before the candidate identity (integrity/shasum) is computed and bound, rewrite the tarball in place: for every packed `dist/native/<platform>-<arch>/manifest.json` matching the guardian artifact schema, locate its sibling binary entry, verify the entry bytes against the manifest's declared `artifact.sha256`/`size`, and set that entry's mode to 0755 (header mode field plus recomputed header checksum, all other bytes untouched). A missing manifest, missing sibling, or digest mismatch fails packing.

Alternatives considered:
- **Move the pack job to a posix runner** — makes CI green but leaves every Windows-hosted pack (local validation tiers, maintainer-driven release flows) producing tarballs that cannot launch on posix, and weakens the guarantee that the pack host is interchangeable. Rejected: treats the symptom in one pipeline instead of the defect in the single pack entry.
- **Force executability during release materialization** — contradicts the immutable payload policy, which deliberately derives installed modes from shipped bytes, and would silently accept tarballs whose surface never declared the helper executable. Rejected: the artifact itself is what is broken.
- **Pre-pack permission fixups** — a no-op on Windows, where the bit cannot be represented at all. Rejected as host-dependent.

### Assert packed guardian executability in `package-surface.test.ts`

Extend the existing exact package surface test — which already enumerates the packed `dist/native/<platform>-<arch>/` entries — with an assertion that every guardian binary entry carries an executable tar mode. This test runs in the `package-smoke` suite on every lane, including the Windows pull-request lane, closing the gap that let #243 merge green while posix release validation failed.

### Keep the workflow topology unchanged

The workflow keeps packing once on `windows-2025` through the pinned script; the repaired tarball flows through the existing candidate identity binding, per-platform validation, and digest-verified publish steps. Because mode repair precedes identity binding, the published bytes remain exactly the validated bytes. Run `.254` is accepted as proof of the Linux mode repair but not as publication acceptance: the aggregate correctly remains fail closed for unrelated required-lane failures.

## Risks / Trade-offs

- [Hand-rolled tar header rewrite corrupts the archive] → Re-parse the repaired archive and verify entry names, order, sizes, and digests against the pre-repair parse before accepting it; the full exact-package validation matrix then runs against the repaired tarball before any publish, and publish fails closed on digest mismatch.
- [A second native helper ships later without a manifest] → The repair iterates every packed guardian artifact manifest rather than a hardcoded filename; a helper shipped without the manifest contract stays non-executable and the surface assertion fails, forcing an explicit decision.
- [npm changes its tar normalization] → Repair runs after `npm pack` and owns the final bytes, so npm behavior changes cannot reintroduce the defect without failing the new surface assertion.
- [Repaired 0755 versus the build's original mode] → The build script certifies 0755 on posix; normalizing to 0755 restores exactly the certified posture rather than inventing a new one.

## Migration Plan

Merge the specification, then implement in a follow-up change. The implementation merged as PR #254 and run `.254` proved the Linux executable-mode correction. Keep this change open while the separately specified Darwin supervisor/containment and Windows Node 22 startup-margin blockers are corrected; then run `npm run develop` once from the new authoritative `develop`. The new numbered preview must pass all platform lanes and publish to npm `next`. No user data, installed releases, or previously published versions are affected; already-blocked previews are superseded by the new number.

## Open Questions

None.
