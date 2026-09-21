## 1. Fix

- [ ] 1.1 Select the measured profiles in the first-attempt startup gate from `cliCapabilities(candidate.manifest.version)` and assert `profiles.length * 3` measurements.
- [ ] 1.2 Prove the stable-candidate boundary: `a1 pi` exits quietly without painting a frame and without diagnostics.
- [ ] 1.3 Update the governance assertions that pinned the fixed profile pair and the hardcoded measurement count.

## 2. Specify

- [ ] 2.1 Record the `a1-shell` delta so the startup budget follows the advertised profiles, retaining every budget value, lane, and first-attempt rule.

## 3. Prove

- [ ] 3.1 Full regression on the fix head passes `package-startup` on both Windows lanes, still recording six measurements for the prerelease candidate.
- [ ] 3.2 After merge, a stable publication dispatch reaches the publish step instead of failing in `Validate win32-node24` and `Validate win32-node22`; record the run and version.
