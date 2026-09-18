# Design

## Groups follow providers

Each group is what one composition-time collaborator knows: the composition's engine decision (adapter, cwd, owned routes, layout), the terminal and the evidence seams that shape presentation, the prompt history service, the prompt suggestion controller, and the clipboard and diagnostic capture. `promptSuggestions` and `promptHistory` become the `suggestions` and `history` groups directly because they were already single-provider objects; `streamPresentation`, `reloadPresentation`, and `inputPresentation` drop their `Presentation` suffix inside the `presentation` group; `pasteDiagnostics` becomes `diagnostics.paste`. The clipboard port sits in `diagnostics` with the copy and paste seams because the same composition decision (owned surfaces plus a capture destination) supplies all three.

## The constructor destructures once

The shell constructor binds every former field to a local of the same name in its first lines, so the four hundred lines that follow read `terminal`, `clipboard`, `promptHistory`, and so on exactly as they read `options.terminal` before. That keeps the diff to the constructor mechanical and reviewable line by line.

## Fixtures keep their parameters

`session-shell-fixture.ts` keeps its positional parameters and types them from the group interfaces (`OwnedUiShellPresentationOptions["stream"]` and so on), so the ten split suites are untouched. Composition tests that inspect the observed options read through the groups.
