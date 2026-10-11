# Tasks

## 1. Classify copyable status rows

- [x] 1.1 Extend dock composition metadata to identify only the rendered footer/status-bar rows, and verify layout coverage distinguishes them from editor, autocomplete, widgets, notices, and transient status.
- [x] 1.2 Retain status-copy eligibility with pinned dock row anchors through full and dock-only composition, and verify viewport tests preserve the classification across output, resize, and recomposition.

## 2. Separate automatic and explicit capture

- [x] 2.1 Add intent-aware frame-selection capture so automatic release remains persistent-transcript-only while explicit capture additionally admits selected status-bar rows; verify focused viewport tests cover status-only, mixed, reverse, partial-column, whitespace, and prompt cases.
- [x] 2.2 Route release and `Ctrl+C` through their respective capture intents without changing selection clearing or bounded delivery, and verify fullscreen shell tests show no release-time status clipboard write followed by one explicit status copy and acknowledgement.

## 3. Preserve surrounding behavior

- [x] 3.1 Verify focused session-shell and viewport suites preserve transcript auto-copy, excluded dock chrome, pinned selections, `/copy`, editor copy/cut, comparison-profile isolation, and asynchronous clipboard behavior; record implementation evidence and any reviewed gap before finalization.
