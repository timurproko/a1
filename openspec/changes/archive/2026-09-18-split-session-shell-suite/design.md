# Design

## Cut at `it` boundaries, keep bodies byte-for-byte

Every case in the main `describe` is self-contained: the only shared state is the helper region before the first `describe` (doubles, fixtures, schedulers), and the compaction `describe` carries its own local helpers. The split therefore slices the file at each top-level `it(` and moves the block unchanged into the file for its concern; the assignment is by the case's position in the original file, where cases were already grouped by the feature that added them. Each new file gets the original import block pruned to the identifiers its body uses, plus an import of the fixture exports it references. `session-shell-fixture.ts` is the helper region with `export` added and its own imports pruned the same way, so a suite that never uses the suggestion conversations no longer reaches that fixture through the import graph.

## Which name survives

The command, notice, and presentation cases keep `session-shell.test.ts`, the name that the source ledger, the session-shell provenance record, and the command workflow outcomes cite as coverage. Those citations describe the family of suites; re-pointing each record at the exact part belongs with the ledger simplification, and the stale-path gate only asks that the path exist.

## Partitions

The paste suite forks paste and copy helpers and starts a durable history worker, which is why the monolith sat in the serial resource-sensitive partition. It joins that partition; the other nine parts run in the ordinary remainder with file parallelism, which shortens the resource-sensitive job by the time their cases used to spend in it. The impact-selector test that proved the suggestion fixture reached the monolith now proves it reaches the selection and suggestions suites only.

## What is deliberately not done here

The 413 raw escape-sequence assertions stay where they are. Rewriting them into plain-text renders plus targeted style assertions changes what each case asserts and needs a reviewer per concern; the extraction changes that follow rewrite each concern's cases anyway and will do it there, where the reviewer already has the concern in view.
