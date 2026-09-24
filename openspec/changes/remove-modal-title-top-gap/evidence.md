# Implementation evidence

## Result

- `PiModalFrame` now owns top-rule/title adjacency and a one-cell global left content inset. It renders top, bottom, and declared separator rules at full width while rendering semantic children against the reduced content width.
- Models, Skills, Thinking, scoped-model, session, tree, trust, extension selector/input/editor, provider-authentication, login, model/theme/image/message selectors, operation/reload loaders, and owned settings sub-dialogs use the shared inset policy at their component boundary.
- Representative renders keep the title immediately beneath the top rule, move titles, inputs, list rows, descriptions, statuses, and shortcuts inside the global left cell, retain relative row indentation, and preserve full-width rules.
- Interaction evidence preserves search/editing, navigation, completion, cancellation, nesting, focus, dynamic list replacement, resize, pointer ownership, restoration, and disposal.
- The explicit `a1 pi` comparison constructors and installed package bytes/prototypes remain unchanged. Parity evidence treats compact padded chrome as the named bare-A1 presentation difference while retaining pinned text and behavior as the oracle.

## Local validation

- `npm run build` — passed.
- `npm run typecheck` — passed.
- `npm run check:architecture` — passed, including the intentionally re-pinned startup graph at 157 files / 1,498,823 source bytes and source-port provenance.
- `npm run check:code-documentation` — passed.
- `npx vitest run test/integrations/pi/components` — 32 files and 309 tests passed.
- Focused modal inventory, project-trust, session-workflow, and dialog-panel run — 4 files and 26 tests passed.
- Focused owned-settings presentation and interaction run — 4 files and 59 tests passed.
- `npx vitest run test/app/session-shell/command-outcome-parity.test.ts` — 1 file and 4 tests passed in truecolor and 256-color modes.
- `npx vitest run test/repository-governance/pinned-pi-public-api.test.ts` — 1 file and 5 tests passed; the consumer baseline is current.
- `npx openspec validate remove-modal-title-top-gap --strict` — passed.
- `git diff --check` — passed.
- `RUN_PROCESS_CONTAINMENT_INTEGRATION=1 STARTUP_BUDGET_ENFORCEMENT=record npm run test:scope -- package-startup` — environment-limited before launch measurement because Windows Defender real-time protection is disabled; the current `develop` candidate passed the required CI lane.

## Known gaps

- No implementation gap is known. Interactive Windows Terminal review remains for maintainer acceptance; local automation does not claim that manual visual decision.
