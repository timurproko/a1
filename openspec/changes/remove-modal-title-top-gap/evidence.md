# Implementation evidence

## Result

- `PiModalHeader` now owns top-rule/title adjacency and provides a structural adapter for public modal components; it does not inspect or rewrite rendered text.
- Models, Skills, Thinking, scoped-model, session, tree, trust, extension selector/input/editor, provider-authentication, and login modal boundaries use the shared header. Existing untitled and extension-owned custom surfaces remain unchanged.
- Representative renders remove exactly the former top-title spacer while preserving title and shortcut columns, body spacing, narrow-width behavior, input, navigation, completion, cancellation, restoration, and disposal.
- The explicit pinned comparison components remain unchanged; provider-authentication evidence compares bare A1 with untouched Pi after removing only Pi's known top-title gap from the expected rows.

## Local validation

- `npm run build` — passed.
- `npm run typecheck` — passed after the build generated the bin-facing declarations.
- `npm run check:architecture` — passed, including the intentionally re-pinned startup graph at 156 files / 1,485,622 source bytes and source-port provenance.
- `npm run check:code-documentation` — passed.
- `npx vitest run test/integrations/pi/components` — 32 files and 304 tests passed.
- Focused modal inventory, project-trust, and session-workflow run — 3 files and 29 tests passed.
- `npx openspec validate remove-modal-title-top-gap --strict` — passed.
- `git diff --check` — passed.

## Known gaps

- No implementation gap is known. Interactive Windows Terminal review remains for maintainer acceptance; local automation does not claim that manual visual decision.
