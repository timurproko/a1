## 1. Evaluator

- [x] 1.1 Replace the promisified `execFile` in `scripts/governance/pi-candidate-evaluator.mjs` with a `cross-spawn` helper that keeps the abort signal, the 120 s timeout, and captured stdout/stderr, and rejects a non-zero exit with the executable, code or signal, and stderr.

## 2. Proof

- [x] 2.1 Run the evaluator on Windows against the current pin (three stages pass) and against `@earendil-works/pi-coding-agent@0.0.1` (the `install` stage fails with npm's `ETARGET` message, tree and lockfile unchanged); run `test/repository-governance/pi-candidate-evaluator.test.ts` (4 pass), `npm run typecheck`, `npm run check:architecture`, `npm run check:code-documentation`, and the changed-documentation check; record outcomes: all OK.
