# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Selecting the terminal host owner schedules one Native terminal host job and three test partition jobs per platform; every role test runs in exactly one partition, and the aggregate fails on a missing, duplicated, or failed partition.
- Resident chaos lanes run a 300-second budget on pull requests and record it as `seconds` in the report; nightly, Full regression, and manual dispatch keep 600.
- Full regression and nightly or candidate publication run five Windows shards per runtime; the `predecessor` shard packs, installs, and runs the published-predecessor invocation on its own, and a missing shard fails the lane.
- Publication cross-compiles the macOS x64 guardian and terminal host on the arm64 runner, uploads both `darwin-*` directories, records the identity check in each manifest, and schedules no Intel runner.
- Every validation and publication job installs the Rust version pinned in `rust-toolchain.toml`, and each Zig cache entry carries the workflow's cache key and the 512 MiB size limit.
- The pinned npm installation step runs only on Node 22 lanes; Node 24 lanes pack with their bundled npm 11.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "ci-critical-path",
  "sourcePr": 789,
  "archive": "openspec/changes/archive/2026-10-17-ci-critical-path/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-17-ci-critical-path/acceptance.md",
  "finalizedDate": "2026-10-17",
  "specBaseSha": "0b6ef5e8357016f3d17b90af2092b14465ff3a53",
  "acceptanceScenarios": [
    "Selecting the terminal host owner schedules one Native terminal host job and three test partition jobs per platform; every role test runs in exactly one partition, and the aggregate fails on a missing, duplicated, or failed partition.",
    "Resident chaos lanes run a 300-second budget on pull requests and record it as `seconds` in the report; nightly, Full regression, and manual dispatch keep 600.",
    "Full regression and nightly or candidate publication run five Windows shards per runtime; the `predecessor` shard packs, installs, and runs the published-predecessor invocation on its own, and a missing shard fails the lane.",
    "Publication cross-compiles the macOS x64 guardian and terminal host on the arm64 runner, uploads both `darwin-*` directories, records the identity check in each manifest, and schedules no Intel runner.",
    "Every validation and publication job installs the Rust version pinned in `rust-toolchain.toml`, and each Zig cache entry carries the workflow's cache key and the 512 MiB size limit.",
    "The pinned npm installation step runs only on Node 22 lanes; Node 24 lanes pack with their bundled npm 11."
  ],
  "archiveDigest": "0dd54145ea6a07ec3cefc813349de2c83ff42e0bff1e913288a3c5a75b110a04",
  "specDigest": "17e8d5687068db397dafb34a67e1b37c31ee0b3411fab878703b21795d8ac1ac",
  "tasksDigest": "d5c47ff72df7443d4d32beeb125fd7e57397957c4e73cadbde259f3d81c7262d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
