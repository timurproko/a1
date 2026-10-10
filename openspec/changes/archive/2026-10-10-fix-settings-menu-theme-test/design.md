# Design

## Context

Before #742 a pointer-opened Settings menu started with no active entry, so the first Down press activated the first choice (`auto`) and the second activated `always`. #742 starts a pointer-opened menu on the value in effect, which is `auto` for this fixture. The two Down presses now end on `hidden`, and the test's `selectedBg` check on `always` fails. #742 updated `test/features/owned-ui/settings-app.test.ts` and `test/ui/components/value-menu.test.ts` but not this composition test, which its focused validation did not run.

## Decisions

- Press Down once so the test still checks the selection background on `always`, a choice other than the value in effect, and the neutral treatment of the `✓` marker on the inactive `auto` entry.
- Leave the production code alone. Starting on the value in effect is the accepted behavior of `open-value-menu-over-anchor`.

## Risks / Trade-offs

- **[The test no longer exercises two navigation steps]** → Arrow navigation is covered in `test/features/owned-ui/settings-app.test.ts`. This test is about the palette.
