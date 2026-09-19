## Context

Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.

## Decisions

- **`dependency-policy` on every Node 24 lane:** `check-deprecated-dependencies.mjs` accepts two deprecated transitive packages (`node-domexception@1.0.0`, `@aws-sdk/core@3.974.11`) only beneath an exact pinned Pi, and the exceptions still named `@earendil-works/pi-coding-agent@0.84.2` after #493 moved the pin to 0.85.1. The packages, versions, paths, and reasons are unchanged under 0.85.1 (verified offline against the lockfile and online against the registry), so the exceptions are re-pinned to 0.85.1, not broadened. The gate is nightly-only, which is why #493 went green; a new governance test now ties every exception's `upstream` to `readPinnedPiIdentity`, so the next Pi upgrade fails PR validation until the exceptions are re-evaluated.
- **Orchestration failure on Windows Node 22:** `prepare-validation-package.mjs` verified the build receipt, ran `npm pack --ignore-scripts`, and the next step's receipt verification failed. Reproduced locally: npm 10 (shipped with Node 22) runs the directory's `prepare` script during pack regardless of `--ignore-scripts` (pacote's `DirFetcher#prepareDir` has no `ignoreScripts` check in npm 10; npm 11 has it), so `npm run build` re-ran mid-pack and rewrote `dist/native/win32-x64/manifest.json` with a new `builtAt`. Fix: the Full regression lanes and the Development validation Node 22 lanes (which pack the candidate themselves) install the pinned `packageManager` npm before `npm ci`, so every lane packs the same way, and `prepare-validation-package.mjs` refuses an npm older than 11 with the reason, so a lane that lost the pin fails at the pack step with a named cause instead of a receipt mismatch two steps later. The receipt itself is unchanged; a rebuild inside pack is a real difference, not noise to tolerate.
- **`pi-tui-identity-installed.test.ts` on Windows Node 22 (exposed once that lane packed):** two of its assertions measured module identity through an in-process `require.resolve` and through `inspectPiTuiModuleIdentity` under the test transformer, and CommonJS resolution consults synchronous loader hooks only from Node 23.5, so on Node 22 they saw the unhooked layout (`split`) although the product, which resolves through the ESM loader from its bin/ entries, is unified. The lane had never run since #479 introduced the hook (PR validation runs these tests on Node 24 only). The test now measures the launch-equivalent answer in a real Node child with the hook installed and `import.meta.resolve`, on every Node version, and keeps the in-process CommonJS assertions where Node hooks them (24+). Verified locally under Node 22.23.2 and 24: the original assertions fail on 22, the patched ones pass on both, and the product identity is `unified`.
- **`clipboard-executor-lifecycle.test.ts` on Linux (surfaced by the dispatched Full regression, flaky):** `assertExited` sampled `child.connected` right after `stopped`, and on Linux the helper's IPC channel closes asynchronously after `exit`, so one of nine helpers still read `connected` although it had exited. The assertion now awaits `disconnect` when the channel is still open before asserting, under the same test deadline; a product-side `disconnect()` in cleanup would be the stronger guarantee but adds bytes to the startup graph, whose baseline has no headroom, so it is left for a deliberate baseline change.
- Introducing changes: #493 (Pi 0.85.1) for the policy failure; the Node 22 pack failure is environmental (npm 10 behaviour) and predates the window, surfacing whenever the receipt inputs include a timestamped artifact; the Node 22 identity-test failure was introduced by #479 and hidden behind the pack failure.

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

## Proof runs on this branch

- [Full regression #25](https://github.com/timurproko/a1/actions/runs/35433536822) on `b779478`: dependency-policy passed on every lane and Windows Node 22 packed; Windows Node 22 failed `pi-tui-identity-installed` (fixed in `e12ed66`); Windows Node 24 failed the startup budget (`pi post-update` 2012 ms > 2000 ms).
- [Full regression #26](https://github.com/timurproko/a1/actions/runs/35435187565) on `e12ed66`: Windows Node 22, Windows Node 24, and macOS passed; Ubuntu failed `clipboard-executor-lifecycle` (fixed in `19f1c42`).
- [Full regression #27](https://github.com/timurproko/a1/actions/runs/35436785254) on `19f1c42`: Ubuntu, macOS, and Windows Node 24 passed; Windows Node 22 failed the startup budget (`a1 no-live-supervisor` 2532 ms > 2500 ms).
- [Full regression #28](https://github.com/timurproko/a1/actions/runs/35438546283) on `19f1c42`: Ubuntu, macOS, and Windows Node 24 passed; Windows Node 22 failed the startup budget (`pi no-live-supervisor` 2715 ms > 2500 ms; `ui-entry` 1184 ms).
- Every fix in this change is green on its lane; the remaining failures are the Windows startup-budget overruns on hosted runners, which this change does not touch and does not weaken. Three of eight Windows lane runs overran the budget across these four dispatches.

