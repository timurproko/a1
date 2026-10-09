## 1. Deterministic path presentation

- [x] 1.1 Add shared path-label candidate generation from basename through normalized rooted path, preserving existing icons and forward-slash display; verify focused presentation tests cover roots, Unicode, image files, and one- and multi-parent candidates.
- [x] 1.2 Budget each classified path occurrence with its longest deterministic candidate tag instead of a fixed hash allowance; verify exact 4,096-unit boundary, duplicate, Unicode, and early-stop compact-presentation tests pass.

## 2. Semantic chip adoption

- [x] 2.1 Route file and folder chips through candidate-based collision resolution with platform-normalized identity reuse while retaining existing URL collision handling; verify no path collision can emit a random hash.
- [x] 2.2 Cover basename preservation, shortest parent suffixes, deeper conflicts, repeated identical paths, file/folder/image-file icons, provisional ownership, and exact copy/history/submission expansion in focused chip-store tests.

## 3. Integrated behavior and validation

- [x] 3.1 Add an owned-shell paste regression using distinct same-name filesystem items; verify visible chips use distinguishing path suffixes and submission receives both exact full paths in order.
- [x] 3.2 Run the focused path-presentation, prompt-chip, and shell-paste tests plus build, typecheck, architecture/documentation governance, and strict OpenSpec validation; record outcomes and disposition any known gaps before finalization.
- [x] 3.3 Build and launch with `./scripts/dev`; verify two same-name folders show basename then shortest distinguishing path label without a hexadecimal suffix, and copying/submitting resolves the intended paths.
