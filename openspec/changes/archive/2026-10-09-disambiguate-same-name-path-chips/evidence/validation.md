# Implementation evidence

## Result

- A non-conflicting pasted file or folder retains its basename-only chip label.
- A different path with the same chip label uses the shortest available trailing path suffix with forward slashes instead of a random hexadecimal suffix.
- Repeated normalized paths reuse one established label, including while isolated paste ownership is provisional.
- Folder, ordinary-file, and image-file chips retain their icons and expand to their exact full paths for copying, history, and submission.
- Path-list compaction budgets the normalized full-path tag before adoption, preserving the 4,096-unit presentation bound.

## Local validation

- `npx vitest run test/app/session-shell/path-chip-presentation.test.ts test/app/session-shell/prompt-chips.test.ts` — 2 files and 34 tests passed, covering candidate labels, boundary accounting, provisional cleanup, shortest suffixes, repeated paths, icons, and semantic expansion.
- `npx vitest run test/app/session-shell/session-shell-paste.test.ts -t "shows distinguishing paths for same-name folders|bounds path-list presentation"` — 13 selected integration cases passed for native/terminal path-list bounds and exact same-name-folder submission.
- `npm run build` — passed and produced the interactive candidate plus current emitted paste helpers.
- `npm run typecheck` — passed after the required build generated the declarations consumed by bin typechecking.
- `npm run check:architecture` — passed after reconciling current `develop` and refreshing the generated startup graph to 155 files / 1,573,425 source bytes; product identity, package identity, pinned Pi source, and terminal-host provenance checks also passed.
- `npm run check:code-documentation:changed` — passed.
- `npx openspec validate disambiguate-same-name-path-chips --strict` — passed.
- `git diff --check` — passed.

## Physical review

The maintainer tested the built candidate through `./scripts/dev` and confirmed that pasting distinct same-name items shows the intended path-based disambiguation without a hexadecimal suffix.

## Known gaps

None.
