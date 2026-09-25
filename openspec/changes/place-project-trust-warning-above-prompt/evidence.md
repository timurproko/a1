# Implementation evidence

## Result

- Trust-preflight warnings carry a dedicated `project-trust` diagnostic code instead of being merged into ordinary engine startup diagnostics.
- Bare A1 translates that warning once into the existing warning-colored dock immediately above the editor and excludes it from the transcript document.
- The pinned `a1 pi` layout continues rendering the same warning above its startup banner.
- Cancelling trust still starts A1 in restricted mode with project resources withheld; trust policy and persistence are unchanged.
- The accepted presentation handoff keeps startup reachability at 157 files / 1,515,963 source bytes.

## Validation

- `npx openspec validate place-project-trust-warning-above-prompt --strict --no-interactive` — passed.
- `npx vitest run test/app/session-shell/session-shell.test.ts test/integrations/pi/engine/runtime-integration.test.ts test/integrations/pi/engine/project-trust-preflight.test.ts test/repository-governance/startup-graph-policy.test.ts` — 4 files and 52 tests passed.
- `npx tsc -p tsconfig.build.json` plus generated settings/startup artifacts and `npm run typecheck` — passed.
- `node scripts/governance/check-architecture.mjs` — passed.
- `node scripts/pi/update-startup-graph-baseline.mjs --check` — passed at 157 files / 1,515,963 bytes.
- `git diff --check` — passed.

## Environment limitation

- `npm ci` installed dependencies but its `prepare` build stopped at the prerequisite check because this shell has no `gh`, `cargo`, or `rustc` on `PATH`. The TypeScript build, generated artifacts, typecheck, focused tests, and affected architecture checks passed independently; exact-head CI retains authority for the complete build.

## Manual handoff

From an uncovered folder under `defaultProjectTrust: ask`, start the development checkout and press Escape in the trust selector. Confirm A1 continues with one warning immediately above the prompt, no warning at the top of the empty viewport, and the folder prompts again on the next launch because cancellation saved no decision.

## Known gaps

None.
