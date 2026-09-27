# Implementation evidence

## Pre-implementation incident

- Development publication run: [36324893276](https://github.com/timurproko/a1/actions/runs/36324893276), source `a22d1e8d701f45e3962bdde417680899fa25f4c7`, candidate `0.2.1-dev.591`.
- Windows Node 24 exact installer validation passed.
- Linux Node 24 job [108636214969](https://github.com/timurproko/a1/actions/runs/36324893276/job/108636214969) failed at `validate-installer-package.mjs:49`: `installer executable help contract is invalid`.
- macOS Node 24 job [108636215022](https://github.com/timurproko/a1/actions/runs/36324893276/job/108636215022) failed at the same assertion.
- Both Unix jobs installed the exact uploaded artifact successfully before invoking its generated launcher. Publication and post-publication jobs were skipped; the registry returned `404` for `@timurproko/a1-install` during investigation.

## Diagnosis and correction

The old entrypoint guard compared the lexical URL of `process.argv[1]` with `import.meta.url`. An npm global Unix launcher is a symlink under `<prefix>/bin`, so lexical resolution did not identify the package executable and `main()` was not called. Windows npm's command shim supplied the package file path and passed.

The corrected guard compares `realpathSync` identities for the argv entry and module file, falling back only to the prior lexical direct-file comparison if canonicalization fails. A subprocess regression imports the helpers from an ordinary ESM entry and proves the installer remains inert. A Unix-only subprocess regression invokes a disposable file symlink and requires the exact help stdout, empty stderr, and status zero.

## Local focused validation

Worktree: `D:/Git/a1/.worktrees/installer-unix-launch` on `fix/installer-unix-launch`.

- `npx vitest run test/foundation/release/installer-bootstrap.test.ts`: **15 passed / 1 expected Windows file-symlink skip**. The import subprocess and all installer behavior tests passed.
- `RELEASE_VERSION=0.2.1-dev.599 node scripts/release/prepare-installer-package.mjs` followed by `validate-installer-package.mjs` against the emitted tarball: validated `@timurproko/a1-install@0.2.1-dev.599` through the real Windows npm shim.
- `npm run typecheck`: passed.
- `npm run check:code-documentation:changed`: passed with no violations.
- `openspec validate fix-installer-unix-launch --strict`: passed.
- No local `test:fast`, `test:full`, or `test:release` suite was run.

## Known gaps

- Local Windows cannot exercise the Unix file-symlink subprocess without developer-mode privilege. The committed assertion remains enabled on Linux/macOS and the unchanged exact-package release validator remains mandatory on all native lanes; this is required CI evidence, not a waived scenario.
- The local tarball is diagnostic evidence only and must not be published. The rejected `.591` artifact remains unpublished, and npm bootstrap must wait for a newly numbered merged candidate whose native lanes all pass.
