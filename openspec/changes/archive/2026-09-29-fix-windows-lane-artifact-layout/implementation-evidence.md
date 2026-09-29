## Implementation evidence

- `.github/workflows/full-regression-shared.yml`: the `windows-lane` upload now lists `.artifacts/validation/full-lanes/*.json` and `.artifacts/validation/full-shards/*.json`, so the archive is rooted at `.artifacts/validation` and the envelope lands at `<artifact>/full-lanes/<lane>.json`, where the unchanged `required` collector looks.
- `test/repository-governance/full-regression-policy.test.ts`: for every `upload-artifact` step whose paths include `full-lanes/`, the test computes the paths' common directory and fails when it ends in `full-lanes/`.

## Focused validation

- The new assertion fails on the previous workflow (`expected '.artifacts/validation/full-lanes/' not to match /full-lanes\/$/`) and passes with the fix.
- `npx vitest run` over `full-regression-policy`, `full-regression-shards`, `pr-full-regression`, `validation-receipt-workflows`, and `ci-release-runbook` passed.
- `npx tsgo -p tsconfig.json --noEmit`, `check:repository-governance` (no differences), and `openspec validate --all --strict` passed. `tsconfig.bin.json` needs a prior `npm run build` for generated `dist` declarations and is unaffected by this change.

## Gap disposition

- Only a hosted Full regression can exercise artifact archiving. The exact-head Full regression is a handoff gate: all four lanes and `Complete regression required` must pass, and the run is reported in the handoff rather than in another committed edit.
