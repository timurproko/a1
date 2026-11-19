# Design

## The ledger is the reviewed authority

The plan sketched a ledger reduced to `upstreamPath`, `sha256`, and `localSha256`, with deviations living only in file headers. The ledger check and the `owned-pi-ui-foundation` customization gate both read classification, status, deviations, tests, and acceptance tasks from the ledger, so those fields stay. What changes is the direction of authority in the updater: it used to know, in code, which units were ported where, and the ledger was its output; now the ledger is its input for everything reviewed and the packages are its input for everything upstream. Adding a port is a ledger edit (a new record's defaults come from `classify()` until reviewed); removing or reclassifying one is a ledger edit the updater keeps. The three tables that named specific components are gone.

## Headers are generated, then required

The header is rendered from the record so it cannot disagree with it. The updater rewrites it before hashing the copy (so `localSha256` covers the header) and the check requires the file to start with exactly that rendering. `Modifications` is the record's sentence, wrapped at 100 columns; `Deviations` lists ids because the reasons and acceptance tests are one lookup away in the ledger and would make the header a second copy of it. The splitter recognizes the previous header styles by their wording (`Adapted from`, `Source-synchronized`, `Source-derived`, `Mechanically adapted`, a bare `Pi` mention in a leading comment) and stops at the first comment that does not mention upstream, so an upstream file's own leading doc comment (daxnuts) survives.

## Check mode

`--check` renders the ledger and headers in memory and compares them to disk, ignoring `recordedAt`, so the nightly sync can ask "is the ledger current?" without a write. It exits non-zero and names each drifting file or the ledger.

## `upstreamLines` stays

`config/baselines/pi-session-shell-provenance.json` records line ranges of the orchestration ports it reimplemented, checked by its own governance test; it is evidence for the shell, not a copied file, and is untouched here.
