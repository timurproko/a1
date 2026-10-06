# Implementation evidence

## Result

- Bare A1 now renders the successful `✓ New session started` result in the transient prompt-adjacent dock instead of the selectable transcript, leaving the empty viewport blank above it.
- The notice reuses the existing `new` command-message renderer, preserving accent styling, exact wording, width-aware wrapping, horizontal padding, and surrounding blank rows.
- The first accepted non-busy-to-busy transition removes only the new-session notice while installing the live `Working…` status, so the two do not coexist; ordinary informational, warning, and error notices retain their existing during-work behavior.
- The pinned `a1 pi` route still appends the new-session confirmation as chronological transcript content.
- Prompt failure behavior was clarified during implementation: a truthful failure notice may replace the idle confirmation before busy state, but no working status is fabricated.

## Validation

- Initial focused test discovery before dependency installation failed because the fresh worktree had no local pinned Pi build output; no tests ran.
- `npm ci --ignore-scripts` — passed and installed the locked dependency graph; npm reported the existing audit summary without changing the lockfile.
- The first focused test run exposed one invalid assertion that treated live transient working rows as an empty viewport document range; the assertion was removed while retaining the pre-work semantic-exclusion check and accepted-transition checks.
- `npm run build` — passed and generated the runnable development build.
- `npm run typecheck` — passed for source and bin projects after the build supplied the expected `dist` declarations. An earlier pre-build invocation passed the source project and then failed only because those generated declarations were absent.
- `npx vitest run test/app/session-shell/session-shell.test.ts test/app/session-shell/session-shell-viewport.test.ts --maxWorkers=1` — 2 files and 60 tests passed, including integrated `/new` routing, bottom placement, accent styling, empty selectable document, first-prompt busy replacement, pinned-route preservation, and viewport lifecycle coverage.
- `npx openspec validate place-new-session-notice-above-prompt --strict` and `git diff --check` — passed.
- Exact-head CI run `37489089609` exposed two deterministic governance omissions: the new implementation comment lacked an approved semantic prefix, and the reviewed eager shell growth exceeded the exact source-byte baseline by 666 bytes. The comment now uses `Rationale:` and `config/startup-graph-baseline.json` is re-pinned from 1,545,092 to the measured 1,545,769 bytes (the additional 11 bytes are the required prefix); file count and Pi artifact totals are unchanged.
- `npm run check:code-documentation`, `npm run check:architecture`, and `node scripts/pi/update-startup-graph-baseline.mjs --check` — passed after the CI repair.

## Known gaps

None. Physical terminal review remains available through the built repository launcher but is not used as automated evidence.
