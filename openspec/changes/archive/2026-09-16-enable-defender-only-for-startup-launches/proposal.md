## Why

The Windows publication lanes enable Windows Defender real-time protection before `npm ci` and therefore before the exact-package global installation, so Defender scans every extracted file of both trees. The single global install costs 114 to 156 seconds on Windows against 4.7 seconds on Linux, and it is the largest single step in a publication. Only the packaged launch measurement needs protection enabled; dependency installation and candidate extraction do not.

## What Changes

- Split shared exact-package preparation out of the validation tier run into its own command so the workflow can enable Defender between preparation and the gates that launch the packaged product.
- Add a bounded preparation handoff: the preparing command writes the verified receipt, installed prefix, and handoff environment to one file, and the validating command verifies that file against the same lane, candidate, and installed bytes before any owner runs.
- Reject a handoff that fails verification with a clear error and never fall back to a second lazy installation; keep the existing end-of-run cleanup, preparation count, and per-owner outcomes unchanged.
- Reorder the Windows steps of the publication and complete regression workflows so dependency installation and candidate extraction run with the runner's default protection state and Defender is enabled before the first packaged launch.
- Keep the `defender-prerequisite` phase of the startup gate as the proof that protection is on at launch time, byte-identical Defender step content, and unchanged startup budgets.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `isolated-regression-testing`: State that Defender real-time protection is required before the first packaged launch and may be disabled while dependencies and the candidate are extracted.
- `continuous-integration`: Define the prepare and handoff contract for shared exact-package installation, its verification, and its fail-closed rejection.

## Impact

Implementation affects `scripts/release/validation-tier.mjs` and `scripts/release/run-validation-tier.mjs`, the `validate` job of `.github/workflows/release.yml`, the regression job of `.github/workflows/full-regression.yml`, and the governance tests that pin workflow step order and tier behavior. It does not change the installation policy, the preparation count, exact-artifact identity checks, the number of measured scenarios, any budget, or publication authority.
