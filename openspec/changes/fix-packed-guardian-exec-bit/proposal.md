## Why

Every development publication since `79180b5` (#243) fails, so `npm run develop` cannot publish any preview. In `Validate linux-node24`, `session-resume.integration.test.ts` fails with `spawn .../dist/native/linux-x64/process-guardian EACCES`: the exact package is packed on `windows-2025`, which cannot represent the executable bit, so the tarball records native guardians as mode 0644 and release materialization installs them as non-executable 0o400. The contemporaneous Darwin lane fails earlier while waiting for supervisor endpoint metadata and is not evidence of the Linux permission error. Windows validation passes the guardian permission path because CreateProcess needs no execute bit, and pull-request CI previously did not assert packed modes—so the packaging defect merged green and blocked the sole publication path.

## What Changes

- Make exact-package packing preserve native process guardian executability regardless of the pack host operating system, so a tarball packed on Windows yields a spawnable posix helper.
- Bind each repaired executable mode to the per-platform guardian build manifest already packed beside the binary, so packing never marks bytes executable that the platform build did not certify.
- Extend exact package surface validation to assert packed native helper entries are executable, so a regression fails on every lane — including Windows pull-request CI — instead of first failing in posix release validation.
- Re-run `npm run develop` after the correction merges, requiring one newly numbered preview to prove the Linux executable-mode repair while every independently required platform lane also passes before publication.
- Record post-merge run `34022380161`: candidate `0.1.8-dev.254` proves Linux and Windows Node 24 package smoke pass with repaired modes, while an independent macOS supervisor-startup failure and Windows Node 22 warm-budget failure correctly keep the publisher closed.
- Keep the pack-once/publish-verified-bytes contract, package contents, validation scope, npm provenance, workflow concurrency, and runtime launch behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: the exact package SHALL preserve every bundled native guardian's executable mode independently of the pack host, and package surface validation SHALL prove that mode host-independently; platform capability remains a separate certified contract.

## Impact

- Affected packaging: `scripts/release/prepare-validation-package.mjs` (the single pack entry used by the release workflow, full-regression workflow, and local validation tiers).
- Affected validation: `test/foundation/release/package-surface.test.ts` gains an executable-mode assertion over packed native helpers; existing `session-resume.integration.test.ts` posix lanes become green without modification.
- Affected evidence: release pipeline policy governance tests may gain a guard tying the pack step to the mode repair.
- No production source, launch chain, release materialization, containment protocol, package contents, public API, dependency, or installed Pi package changes.
- Blocked previews `0.1.8-dev.249` through `.254` remain unpublished. The executable-mode implementation is proven on Linux, but final publication depends on `fix-darwin-packaged-supervisor-startup` and the Node 22 correction in `reduce-post-update-cold-start`.
