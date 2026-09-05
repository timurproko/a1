## 1. Pack-time executable repair

- [ ] 1.1 Add a tar entry mode-repair unit to the release tooling that, given a packed tarball, finds every `dist/native/<platform>-<arch>/manifest.json` matching the `a1-process-guardian-artifact-v1` schema, verifies the sibling binary entry against the manifest's `artifact.sha256`/`size`, sets that entry's mode to 0755 with a recomputed header checksum, and leaves every other byte untouched; verify with unit tests covering a Windows-mode fixture tarball (0644 → 0755), an already-correct tarball (unchanged bytes except nothing to do), a digest mismatch (packing fails), and a missing sibling entry (packing fails)
- [ ] 1.2 Invoke the repair in `scripts/release/prepare-validation-package.mjs` after `npm pack` and before candidate identity (integrity/shasum) is read, re-parsing the repaired archive to confirm entry names, order, sizes, and digests match the pre-repair parse; verify `node scripts/release/prepare-validation-package.mjs` on Windows produces a `candidate.tgz` whose `dist/native/linux-x64/process-guardian` and `dist/native/darwin-arm64/process-guardian` tar entries carry mode 0755 while all other entries keep their original modes

## 2. Host-independent surface validation

- [ ] 2.1 Extend `test/foundation/release/package-surface.test.ts` to assert every packed native process guardian entry is recorded executable; verify the assertion fails against a pre-fix tarball (e.g. published `0.1.8-dev.226`) and passes against the repaired candidate from task 1.2, on Windows and posix

## 3. Governance and end-to-end confirmation

- [ ] 3.1 Align release pipeline governance coverage with the repaired pack contract (the workflow still packs exactly once through `prepare-validation-package.mjs`, the publisher still never repacks), updating or adding policy tests so they pass with the change and fail if the pack step bypasses the repair
- [ ] 3.2 Run the repository's required validation for the implementation pull request and confirm the required check passes, including the Windows `package-smoke` lane executing the new surface assertion
- [ ] 3.3 After the implementation merges, run `npm run develop` and confirm one newly numbered preview passes `Validate linux-node24`, `Validate darwin-node24`, `Validate win32-node22`, and `Validate win32-node24`, publishes to npm `next`, and that installing that preview on linux or darwin launches the packaged public chain with the guardian spawning successfully (no `EACCES`)
