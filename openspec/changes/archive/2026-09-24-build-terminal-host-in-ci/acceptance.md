# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A pull request that changes `native/terminal-host/` or its run scripts runs the Native terminal host (Windows) job, which builds, unit-tests and probes the crate and uploads `terminal-host.exe`; unrelated changes do not run it.
- Running `cargo test`, `cargo build` or `npm run test:terminal-host` on a Windows workstation outside CI stops before Zig runs, naming the CI job and the `TERMINAL_HOST_LOCAL_BUILD=1` override.
- Nightly Full regression and release gates do not build the terminal host, through the single declared `fullReleaseExclusion`.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "build-terminal-host-in-ci",
  "sourcePr": 588,
  "archive": "openspec/changes/archive/2026-09-24-build-terminal-host-in-ci/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-build-terminal-host-in-ci/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "02c486e59b97b19bbb53d3b8e3dbf595ceeb708e",
  "acceptanceScenarios": [
    "A pull request that changes `native/terminal-host/` or its run scripts runs the Native terminal host (Windows) job, which builds, unit-tests and probes the crate and uploads `terminal-host.exe`; unrelated changes do not run it.",
    "Running `cargo test`, `cargo build` or `npm run test:terminal-host` on a Windows workstation outside CI stops before Zig runs, naming the CI job and the `TERMINAL_HOST_LOCAL_BUILD=1` override.",
    "Nightly Full regression and release gates do not build the terminal host, through the single declared `fullReleaseExclusion`."
  ],
  "archiveDigest": "0df6fcaefc867e7ceedafb7fe4e355c79b1cb84e392d43611e615035b88eb61a",
  "specDigest": "44d5ea774dee21114c255c6bc8cc9d9cbf2e3f93bedb478ef3c2a0fed1233ea8",
  "tasksDigest": "e75fdfeb4b6a87c783293dab18601fa6cdf193cab8e143ac87f2f85e3d117bca",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
