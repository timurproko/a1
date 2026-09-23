## 1. Move the startup cue out of the transcript

- [ ] 1.1 Route the first bare-A1 startup changelog diagnostic, whether expanded or collapsed, through the existing informational dock notice with exactly `Run /changelog to view the full release notes.`, and verify repeated view synchronization cannot recreate a replaced or dismissed notice.
- [ ] 1.2 Remove custom-viewport document rendering and automatic reference-screen opening for startup changelog diagnostics while preserving the on-demand `/changelog` route, and verify no heading, border, changelog entry, or route open is produced at startup.
- [ ] 1.3 Keep engine changelog detection, acknowledgement, `collapseChangelog`, and pinned-layout presentation unchanged, and verify focused engine and comparison-profile cases retain their existing outcomes.

## 2. Prove transient behavior

- [ ] 2.1 Update startup release-note tests for expanded and collapsed launches to verify the exact one-line dock text, no transcript rows, no automatic screen, and unchanged acknowledged-version storage.
- [ ] 2.2 Add presentation-lifetime coverage showing assistant/tool content does not move the notice into the document, a newer informational notice replaces it, the next user or shell-command block dismisses it, and transcript selection/copy surfaces exclude it.
- [ ] 2.3 Retain on-demand and pinned compatibility coverage, verifying `/changelog` still opens the complete bare-A1 reference screen without feed output and `a1 pi` retains its pinned expanded or collapsed transcript block.

## 3. Reconcile declared presentation ownership

- [ ] 3.1 Update presenter ownership and pinned-source deviation descriptions that currently describe automatic startup reference-screen presentation, and verify the relevant repository-governance checks accept the transient-dock classification.
- [ ] 3.2 Run the implementation-selected focused tests, type checking, and impact selection in CI, then hand off the built candidate for a startup-upgrade check confirming the notice remains immediately above the editor while conversation content grows.
