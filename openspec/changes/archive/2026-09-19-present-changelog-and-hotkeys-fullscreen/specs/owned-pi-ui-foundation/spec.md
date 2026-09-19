## ADDED Requirements

### Requirement: The changelog and hotkeys commands open reference screens in bare A1
Bare A1 SHALL declare `/changelog` and `/hotkeys` as A1-owned replacements for the pinned in-feed changelog and keyboard-shortcut documents. The owned route host SHALL claim both routes ahead of the pinned workflow table, so invoking either in bare A1 opens the A1-owned reference screen full screen over the session and appends no document, status, checkmark, or error row to the feed. `/changelog` SHALL open the screen titled `What's New` with the complete pinned changelog Markdown in the same order and with the same link rewriting the pinned `/changelog` workflow produces. `/hotkeys` SHALL open the screen titled `Keyboard Shortcuts` with the bare-A1 keybinding-derived tables the in-feed presenter produced for the `a1` profile, including the current editor keybinding configuration and the extension shortcut descriptions, gathered when the screen opens. Both documents SHALL be rendered through the same settings-aware Markdown presentation and theme the in-feed documents used, without the spacer, border, and heading rows that were feed chrome, so each visible document row equals the corresponding row of the former in-feed document at the same width.

The screen SHALL be presented through the same owned route path as `/settings`: full-size top-left overlay with owned input coordination, pointer reporting enabled for its lifetime and disabled when it closes, mouse reports routed to the screen before any other surface, and the interrupt chord watched on raw input. The commands SHALL remain listed in the slash-command menu with their pinned descriptions. The `a1 pi` comparison profile and untouched pinned Pi SHALL retain the pinned in-feed documents; without the owned route host the commands remain pinned workflow routes. A1 SHALL NOT mutate installed Pi packages, their exported constructors, or their prototypes to implement the replacement.

#### Scenario: Invoke the changelog command in bare A1
- **WHEN** the user submits `/changelog` in bare A1
- **THEN** the `What's New` reference screen SHALL open with the complete pinned changelog, the editor SHALL be cleared, and the feed SHALL gain no rows
- **AND** pressing `Esc` SHALL close it and restore the session with its transcript position unchanged

#### Scenario: Invoke the hotkeys command in bare A1
- **WHEN** the user submits `/hotkeys` in bare A1
- **THEN** the `Keyboard Shortcuts` reference screen SHALL open with the bare-A1 Navigation, Editing, Other, and, when any exist, Extensions tables and the feed SHALL gain no rows
- **AND** a keybinding configuration reloaded before the next invocation SHALL be reflected the next time the screen opens

#### Scenario: Scroll and close a reference command screen
- **WHEN** the changelog or hotkeys screen is open above an overflowing document
- **THEN** keyboard, wheel, rail hover, thumb drag, and track paging SHALL scroll the document as the reference screen specifies, no transcript scroll, selection, or control SHALL activate through the screen, and closing SHALL restore pointer reporting and the viewport as after `/settings`

#### Scenario: Invoke either command in the comparison profile
- **WHEN** the user submits `/changelog` or `/hotkeys` in `a1 pi`
- **THEN** the pinned workflow SHALL run and the pinned in-feed document with its spacer, borders, heading, Markdown, and chronological placement SHALL be appended exactly as before

### Requirement: Startup release notes open as a reference screen in bare A1
Bare A1 SHALL keep the pinned changelog startup lifecycle: the engine's new-entries-since-last-version reading, the `collapseChangelog` decision, the expanded or collapsed diagnostic, and the stored acknowledged version SHALL be unchanged. In the custom viewport, both the expanded and the collapsed diagnostic SHALL render as the compact two-line hint (`What's New` and `Run /changelog to view the full release notes.`) at the pinned position after the transcript rows, and the full document SHALL NOT be rendered in the feed. When the expanded diagnostic first arrives and the runtime is active, the owned route host exists, and no dialog, selector, or owned route is presented, the shell SHALL open the `What's New` reference screen once with exactly the new entries the diagnostic carries. When a modal is presented at that moment, the screen SHALL NOT be opened later for that launch; the hint remains and `/changelog` shows the complete changelog. The pinned layout SHALL keep rendering the expanded document in the feed and SHALL open no screen.

#### Scenario: Start bare A1 after an upgrade with the changelog expanded
- **WHEN** bare A1 starts an empty session, the stored last changelog version is older than the pinned version, and `collapseChangelog` is off
- **THEN** the feed SHALL show the two-line hint, the `What's New` screen SHALL open once with only the entries newer than the stored version, and the stored version SHALL advance as pinned Pi specifies
- **AND** closing the screen SHALL leave the hint in the feed and the editor focused

#### Scenario: Start bare A1 with the changelog collapsed
- **WHEN** the same launch has `collapseChangelog` on
- **THEN** only the two-line hint SHALL be shown and no screen SHALL open

#### Scenario: A modal is already presented
- **WHEN** the expanded diagnostic arrives while a dialog, selector, or owned route is presented
- **THEN** no screen SHALL open for that launch, the hint SHALL remain, and `/changelog` SHALL still open the complete changelog on request

#### Scenario: Start the comparison profile after an upgrade
- **WHEN** `a1 pi` starts under the same conditions
- **THEN** the pinned expanded or collapsed transcript block SHALL be rendered in the feed exactly as before and no screen SHALL open
