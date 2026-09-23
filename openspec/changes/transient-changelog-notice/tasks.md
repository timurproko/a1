## 1. Move the startup cue out of the transcript

- [x] 1.1 Route the first bare-A1 startup changelog diagnostic, whether expanded or collapsed, through the existing informational dock notice with exactly `Run /changelog to view the full release notes.`, and verify repeated view synchronization cannot recreate a replaced or dismissed notice.
- [x] 1.2 Remove custom-viewport document rendering and automatic reference-screen opening for startup changelog diagnostics while preserving the on-demand `/changelog` route, and verify no heading, border, changelog entry, or route open is produced at startup.
- [x] 1.3 Keep engine changelog detection, acknowledgement, `collapseChangelog`, and pinned-layout presentation unchanged, and verify focused engine and comparison-profile cases retain their existing outcomes.

## 2. Prove transient behavior

- [x] 2.1 Update startup release-note tests for expanded and collapsed launches to verify the exact one-line dock text, no transcript rows, no automatic screen, and unchanged acknowledged-version storage.
- [x] 2.2 Add presentation-lifetime coverage showing assistant/tool content does not move the notice into the document, a newer informational notice replaces it, the next user or shell-command block dismisses it, and transcript selection/copy surfaces exclude it.
- [x] 2.3 Retain on-demand and pinned compatibility coverage, verifying `/changelog` still opens the complete bare-A1 reference screen without feed output and `a1 pi` retains its pinned expanded or collapsed transcript block.

## 3. Reconcile declared presentation ownership

- [x] 3.1 Update presenter ownership and pinned-source deviation descriptions that currently describe automatic startup reference-screen presentation, and verify the relevant repository-governance checks accept the transient-dock classification.
- [x] 3.2 Build the implementation and run focused session-shell, presenter, governance, OpenSpec, and type-check validation; verify all selected local evidence passes before exact-head CI and manual handoff.
