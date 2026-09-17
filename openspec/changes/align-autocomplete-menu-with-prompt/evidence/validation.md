# Implementation Validation Evidence

Recorded: 2026-09-17T16:10:00Z

## Regression baseline

Against the planning base, the updated prompt-input assertion failed as expected: the `after` row rendered as `  menu` with the two-cell prompt inset instead of `menu`. The above-prompt placement test likewise failed in both history modes because every menu row carried the leading inset (`  → choice`) instead of starting at the prompt glyph column (`→ choice`).

## Passing evidence

- Prompt-input component (8 tests): the first body row keeps `❯ first`, the continuation row keeps `  second`, and the menu row renders flush as `menu`; rule fragments, geometry, and clipping are unchanged.
- Above-prompt placement (18 tests, history enabled and disabled): argument, path, resource, and extension lists match the reference editor byte for byte after a two-cell right pad instead of a two-cell left inset, across 12, 40, and 80 columns and every selection index; sizing, pagination, the top counter line, navigation, Tab/Enter application, asynchronous provider dismissal, and the border-color match remain green.
- Prompt-input UX (14 tests) and shell components (24 tests): selection, paste, pointer, and menu lifting behavior unchanged.
- UI components scope (18 files, 263 tests) and repository governance (1058 tests): passed.
- TypeScript project typecheck, architecture, naming, code-documentation, and docs governance: passed after recording the startup graph at 2646249 source bytes (the `Rationale` comment on the flush `after` rows adds 126 bytes to the reachable graph).

## Physical acceptance

Pending: hand off the built candidate so the user can confirm `→` under `❯`, the command under the draft text, and the unchanged command-to-description gap.

## Gap disposition

No known implementation or validation gaps remain. Full regression and native host gates remain CI-owned under repository policy.
