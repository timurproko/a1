## 1. Pack-time executable repair

- [x] 1.1 Add a tar entry mode-repair unit to the release tooling that, given a packed tarball, finds every `dist/native/<platform>-<arch>/manifest.json` matching the `a1-process-guardian-artifact-v1` schema, verifies the sibling binary entry against the manifest's `artifact.sha256`/`size`, sets that entry's mode to 0755 with a recomputed header checksum, and leaves every other byte untouched; verify with unit tests covering a Windows-mode fixture tarball (0644 → 0755), an already-correct tarball (unchanged bytes except nothing to do), a digest mismatch (packing fails), and a missing sibling entry (packing fails)
- [x] 1.2 Invoke the repair in `scripts/release/prepare-validation-package.mjs` after `npm pack` and before candidate identity (integrity/shasum) is read, re-parsing the repaired archive to confirm entry names, order, sizes, and digests match the pre-repair parse; verify `node scripts/release/prepare-validation-package.mjs` on Windows produces a `candidate.tgz` whose `dist/native/linux-x64/process-guardian` and `dist/native/darwin-arm64/process-guardian` tar entries carry mode 0755 while all other entries keep their original modes

## 2. Host-independent surface validation

- [x] 2.1 Extend `test/foundation/release/package-surface.test.ts` to assert every packed native process guardian entry is recorded executable; verify the assertion fails against a pre-fix tarball (e.g. published `0.1.8-dev.226`) and passes against the repaired candidate from task 1.2, on Windows and posix

## 3. Governance and end-to-end confirmation

- [x] 3.1 Align release pipeline governance coverage with the repaired pack contract (the workflow still packs exactly once through `prepare-validation-package.mjs`, the publisher still never repacks), updating or adding policy tests so they pass with the change and fail if the pack step bypasses the repair
- [x] 3.2 Run the repository's required validation for implementation PR #254 and confirm the required check passes, including the Windows `package-smoke` lane executing the new surface assertion
- [ ] 3.3 After `fix-darwin-packaged-supervisor-startup` and the Windows Node 22 correction in `reduce-post-update-cold-start` merge, run `npm run develop` once and confirm one newly numbered preview passes `Validate linux-node24`, `Validate darwin-node24`, `Validate win32-node22`, and `Validate win32-node24`, publishes to npm `next`, and that installing that preview on supported posix platforms launches the packaged public chain without permission failure

## 4. Record Post-Merge Evidence and Linked Blockers

- [x] 4.1 Record run `34022380161`, source `4e7901f3e0105ae5de6c54be49dc2728677a3f74`, candidate `0.1.8-dev.254`, successful package/Linux Node 24/Windows Node 24 outcomes, absence of Linux `EACCES`, Darwin supervisor-readiness timeout, Windows Node 22 3,453 ms warm-budget failure, skipped publisher, failed aggregate, and registry absence; verify the job identities and conclusions against GitHub
- [x] 4.2 Reconcile this change's scope so executable mode remains distinct from platform capability and startup performance; verify Darwin capability is assigned to `fix-darwin-packaged-supervisor-startup`, Node 22 margin remains in `reduce-post-update-cold-start`, and neither blocker weakens this change's completed packing requirements
