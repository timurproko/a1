# Implementation evidence

## Pre-implementation incident

- Development publication run: [36324893276](https://github.com/timurproko/a1/actions/runs/36324893276), source `a22d1e8d701f45e3962bdde417680899fa25f4c7`, candidate `0.2.1-dev.591`.
- Windows Node 24 exact installer validation passed.
- Linux Node 24 job [108636214969](https://github.com/timurproko/a1/actions/runs/36324893276/job/108636214969) failed at `validate-installer-package.mjs:49`: `installer executable help contract is invalid`.
- macOS Node 24 job [108636215022](https://github.com/timurproko/a1/actions/runs/36324893276/job/108636215022) failed at the same assertion.
- Both Unix jobs installed the exact uploaded artifact successfully before invoking its generated launcher. Publication and post-publication jobs were skipped; the registry returned `404` for `@timurproko/a1-install` during investigation.

## Planning diagnosis

The current entrypoint guard compares the lexical URL of `process.argv[1]` with `import.meta.url`. An npm global Unix launcher is a symlink under `<prefix>/bin`, so lexical resolution does not identify the package executable and `main()` is not called. Windows npm's command shim supplies the package file path and passed. This source inspection explains the observed platform split; implementation must retain a failing-before/passing-after symlink regression rather than treating the diagnosis alone as validation.

## Implementation results

Pending explicit plan approval and implementation.

## Known gaps

- Native Linux/macOS packed-launcher confirmation is pending the finalized implementation CI run.
- No installer package version has been published, and the rejected `.591` artifact must remain unpublished.
