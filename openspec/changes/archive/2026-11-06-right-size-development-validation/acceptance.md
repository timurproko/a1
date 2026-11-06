# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A candidate-packing lane whose native inputs match a cached key restores the release terminal host, re-records the host-entry digest, verifies it, and packs without installing Rust or Zig.
- A changed native tree, toolchain pin, or build script misses the cache and builds the release terminal host as before; a tampered restored file fails the lane before the build receipt.
- Terminal-host partitions run only their role_integration slice while the build-and-probe lane still runs the unit, binary, and release-isolation tests once per target.
- The Linux terminal-host lane runs the same four fuzz targets with the same budget using a cached cargo-fuzz binary, installing it only on a cache miss.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "right-size-development-validation",
  "sourcePr": 873,
  "archive": "openspec/changes/archive/2026-11-06-right-size-development-validation/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-06-right-size-development-validation/acceptance.md",
  "finalizedDate": "2026-11-06",
  "specBaseSha": "2ac8757a1f0fddf0534e86330097aa7453f5b987",
  "acceptanceScenarios": [
    "A candidate-packing lane whose native inputs match a cached key restores the release terminal host, re-records the host-entry digest, verifies it, and packs without installing Rust or Zig.",
    "A changed native tree, toolchain pin, or build script misses the cache and builds the release terminal host as before; a tampered restored file fails the lane before the build receipt.",
    "Terminal-host partitions run only their role_integration slice while the build-and-probe lane still runs the unit, binary, and release-isolation tests once per target.",
    "The Linux terminal-host lane runs the same four fuzz targets with the same budget using a cached cargo-fuzz binary, installing it only on a cache miss."
  ],
  "archiveDigest": "273abfb13a25cb0e81161c45e3624db07a4d16bfddd5a7b0eeda614e230e6548",
  "specDigest": "57ca6521080b8d1f226bdd1d4d4aa6dfeb9800819bea2d10c137db14aa468ec2",
  "tasksDigest": "92cf2517db49f1dddf4c228bda684c430edac0410e2ff0fbf3555f76ed06e8b2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
