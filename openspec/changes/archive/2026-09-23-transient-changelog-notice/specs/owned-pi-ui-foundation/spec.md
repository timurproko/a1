## MODIFIED Requirements

### Requirement: Startup release notes open as a reference screen in bare A1
Bare A1 SHALL keep the pinned changelog startup lifecycle: the engine's new-entries-since-last-version reading, the `collapseChangelog` decision, the expanded or collapsed diagnostic, and the stored acknowledged version SHALL be unchanged. In the custom viewport, either diagnostic SHALL produce one transient informational dock notice containing exactly `Run /changelog to view the full release notes.` The notice SHALL use the same placement and lifetime as other bare-A1 informational workflow statuses: it remains outside the transcript document and its scrolling, selection, and copy surfaces; it is replaced by a newer dock notice; and the next user prompt or shell command dismisses it. Bare A1 SHALL NOT render the startup diagnostic as a bordered or persistent feed block, SHALL NOT include a `What's New` heading in the notice, SHALL NOT render changelog entries in the feed, and SHALL NOT automatically open the `What's New` reference screen. `/changelog` SHALL continue to open the complete changelog on request. The pinned layout SHALL keep rendering the expanded or collapsed transcript block and SHALL open no screen.

#### Scenario: Start bare A1 after an upgrade with the changelog expanded
- **WHEN** bare A1 starts an empty session, the stored last changelog version is older than the pinned version, and `collapseChangelog` is off
- **THEN** one transient dock notice SHALL show exactly `Run /changelog to view the full release notes.`, no startup reference screen SHALL open, and the stored version SHALL advance as pinned Pi specifies
- **AND** the notice SHALL contribute no transcript rows or changelog-entry content

#### Scenario: Start bare A1 with the changelog collapsed
- **WHEN** the same launch has `collapseChangelog` on
- **THEN** the same one-line transient dock notice SHALL be shown and no screen SHALL open

#### Scenario: A modal is already presented
- **WHEN** either startup changelog diagnostic arrives while a dialog, selector, or owned route is presented
- **THEN** no release-notes screen SHALL open, the dock notice SHALL remain available when the modal closes, and `/changelog` SHALL still open the complete changelog on request

#### Scenario: Continue working after the startup notice
- **WHEN** assistant or tool content is added while the startup notice is visible
- **THEN** the notice SHALL remain at the informational dock position rather than moving with that content or becoming selectable transcript content
- **AND** a newer dock notice SHALL replace it, while the next user prompt or shell command SHALL dismiss it

#### Scenario: Open release notes on request
- **WHEN** the user invokes `/changelog` after seeing or dismissing the startup notice
- **THEN** the `What's New` reference screen SHALL open with the complete changelog and the feed SHALL gain no rows

#### Scenario: Start the comparison profile after an upgrade
- **WHEN** `a1 pi` starts under the same conditions
- **THEN** the pinned expanded or collapsed transcript block SHALL be rendered in the feed exactly as before and no screen SHALL open
