## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.

## Evidence

- Run [Full regression #24](https://github.com/timurproko/a1/actions/runs/35429594510) (attempt 1, schedule) on `30546e1` at 2026-09-19T07:32:17Z:
  - `deprecated-dependencies` (`dependency-policy`) failed on macos-15-node24, ubuntu-24.04-node24, windows-2025-node24 with exit 1.
    - Command: `npm run check:deprecated`
    - Log excerpt:

      ```text
      Deprecated dependency policy failed (2):
      - node-domexception@1.0.0 [registry]
          path: @timurproko/a1@0.1.8-dev -> @earendil-works/pi-coding-agent@0.85.1 -> @earendil-works/pi-ai@0.85.1 -> @google/genai@1.52.0 -> google-auth-library@10.6.2 -> gaxios@7.1.4 -> node-fetch@3.3.2 -> fetch-blob@3.2.0 -> node-domexception@1.0.0
          reason: Use your platform's native DOMException instead
      - @aws-sdk/core@3.974.11 [registry]
      ##[error]Process completed with exit code 1.
      ##[group]Run if [ -f .artifacts/validation/full-regression.json ]; then
      ^[[36;1mif [ -f .artifacts/validation/full-regression.json ]; then^[[0m
      ^[[36;1m  node --input-type=module <<'NODE' >> "$GITHUB_STEP_SUMMARY"^[[0m
      ^[[36;1mimport { readFile } from "node:fs/promises";^[[0m
      ^[[36;1m  echo "Validation orchestration failed before producing owned outcomes." >> "$GITHUB_STEP_SUMMARY"^[[0m
      ^[[36;1mfi^[[0m
      shell: /bin/bash --noprofile --norc -e -o pipefail {0}
      ##[endgroup]
      ##[group]Run actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f
      ```

  - Lane windows-2025-node22 failed in job `Complete non-physical regression (windows-2025, node 22)` before producing owner outcomes (orchestration failure).
    - Log excerpt:

      ```text
        if (canonical(receipt) !== canonical(current)) throw new Error("validation build receipt or artifacts do not match current inputs");
                                                             ^
      Error: validation build receipt or artifacts do not match current inputs
          at verifyBuildReceipt (file:///D:/a/a1/a1/scripts/release/validation-receipt.mjs:24:56)
          at async prepareSharedExactPackage (file:///D:/a/a1/a1/scripts/release/validation-tier.mjs:432:3)
          at async file:///D:/a/a1/a1/scripts/release/run-validation-tier.mjs:14:19
      Node.js v22.23.2
      ##[error]Process completed with exit code 1.
      ##[group]Run if [ -f .artifacts/validation/full-regression.json ]; then
      ^[[36;1mif [ -f .artifacts/validation/full-regression.json ]; then^[[0m
      ^[[36;1m  node --input-type=module <<'NODE' >> "$GITHUB_STEP_SUMMARY"^[[0m
      ^[[36;1mimport { readFile } from "node:fs/promises";^[[0m
      ^[[36;1m  echo "Validation orchestration failed before producing owned outcomes." >> "$GITHUB_STEP_SUMMARY"^[[0m
      ^[[36;1mfi^[[0m
      shell: C:\Program Files\Git\bin\bash.EXE --noprofile --norc -e -o pipefail {0}
      ##[endgroup]
      ##[group]Run actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f
      ```

  - Last successful Full regression run: [#3](https://github.com/timurproko/a1/actions/runs/32616699736) on `6c97783`; 0 `develop` commits since:
