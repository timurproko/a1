## 1. Fix

- [x] 1.1 Select the measured profiles in the first-attempt startup gate from `cliCapabilities(candidate.manifest.version)` and assert `profiles.length * 3` measurements.
- [x] 1.2 Prove the stable-candidate boundary: `a1 pi` exits quietly without painting a frame and without diagnostics.
- [x] 1.3 Update the governance assertions that pinned the fixed profile pair and the hardcoded measurement count.

## 2. Specify

- [x] 2.1 Record the `a1-shell` delta so the startup budget follows the advertised profiles, retaining every budget value, lane, and first-attempt rule.

## 3. Prove

- [x] 3.1 Full regression on the fix head passes `package-startup` on both Windows lanes, still recording six measurements for the prerelease candidate.
  - Run 35663793824 on `4c5bb8bb`: success on all four lanes. The windows-2025 node 22 lane recorded all six measurements within budget — `a1` post-update 1172 ms, no-live-supervisor 1370 ms, warm 1152 ms; `pi` post-update 1035 ms, no-live-supervisor 1252 ms, warm 1036 ms. Its first attempt failed before any test when that runner came up without `rustc` and `gh`, so `npm ci` could not run its prepare build; the re-run on the same commit passed.
  - The stable path cannot be exercised before merge, because every pre-merge workflow validates a prerelease candidate. It is carried as an acceptance scenario on the pull request and verified by the stable publication itself.
