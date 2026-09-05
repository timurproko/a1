## Why

Every development publication since `79180b5` (#243) fails, so `npm run develop` cannot publish any preview. The `Validate linux-node24` and `Validate darwin-node24` release gates fail in `session-resume.integration.test.ts` with `spawn .../dist/native/linux-x64/process-guardian EACCES`: the exact package is packed on `windows-2025`, which cannot represent the executable bit, so the tarball records the native process guardian as mode 0644, release materialization installs it as 0o400, and posix containment cannot spawn it. Windows validation passes because CreateProcess needs no execute permission, and pull-request CI exercises the package-consuming smoke suite only on Windows — so the defect merged green and now blocks the sole publication path.

## What Changes

- Make exact-package packing preserve native process guardian executability regardless of the pack host operating system, so a tarball packed on Windows yields a spawnable posix helper.
- Bind each repaired executable mode to the per-platform guardian build manifest already packed beside the binary, so packing never marks bytes executable that the platform build did not certify.
- Extend exact package surface validation to assert packed native helper entries are executable, so a regression fails on every lane — including Windows pull-request CI — instead of first failing in posix release validation.
- Re-run `npm run develop` after the correction merges, requiring one newly numbered preview to pass every platform lane and publish to npm `next`.
- Keep the pack-once/publish-verified-bytes contract, package contents, validation scope, npm provenance, workflow concurrency, and runtime launch behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: the exact package SHALL carry a spawn-capable native process guardian for every validated platform, packing SHALL preserve that executability independent of the pack host, and package surface validation SHALL prove it host-independently.

## Impact

- Affected packaging: `scripts/release/prepare-validation-package.mjs` (the single pack entry used by the release workflow, full-regression workflow, and local validation tiers).
- Affected validation: `test/foundation/release/package-surface.test.ts` gains an executable-mode assertion over packed native helpers; existing `session-resume.integration.test.ts` posix lanes become green without modification.
- Affected evidence: release pipeline policy governance tests may gain a guard tying the pack step to the mode repair.
- No production source, launch chain, release materialization, containment protocol, package contents, public API, dependency, or installed Pi package changes.
- Blocked previews `0.1.8-dev.249` and later remain unpublished; the repaired authoritative `develop` commit derives a new immutable preview number from its own merged pull request.
