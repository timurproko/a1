## 1. Child output discipline

- [x] 1.1 Make `createNpmProcessRunner` capture stdout and a bounded stderr tail for every child with no inherited terminal stream, return `stderr` on `ProcessResult`, and export `CHILD_DIAGNOSTIC_LIMIT`.
- [x] 1.2 Print a failed child's text once, before the failure line, through `reportChildDiagnostics` in `runNpm`, the installation branch, and the protected replacement branch; add the `Review npm's diagnostics above.` hint only when something was printed; drop a successful child's text.
- [x] 1.3 Test the runner against real children (captured stderr on success and failure, the tail bound) and the orchestration paths (lookup failure with and without text, all-success run with noisy stderr, installation failure, replacement success and failure).

## 2. Retired helper entry

- [x] 2.1 Add `bin/sync-pi-tui-proxy.js` that exits 0 without output for updaters older than 0.1.8-dev.479; test it through the runner and list it in the packed command surface.

## 3. Specification

- [x] 3.1 Apply the `cli-self-update` delta: no child of the updater writes to the terminal, a failed child's bounded text precedes the failure line, and the retired entry exits silently.
