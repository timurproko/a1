## MODIFIED Requirements

### Requirement: The changelog and hotkeys commands open reference screens in bare A1
Bare A1 SHALL declare `/changelog` and `/hotkeys` as A1-owned replacements for the pinned in-feed changelog and keyboard-shortcut documents. The owned route host SHALL claim both routes ahead of the pinned workflow table, so invoking either in bare A1 opens the A1-owned reference screen full screen over the session and appends no document, status, checkmark, or error row to the feed. `/changelog` SHALL open the screen titled `What's New` with the complete pinned changelog Markdown in the same order and with the same link rewriting the pinned `/changelog` workflow produces. `/hotkeys` SHALL open the screen titled `Keyboard Shortcuts` with the bare-A1 keybinding-derived tables the in-feed presenter produced for the `a1` profile, including the current editor keybinding configuration and extension shortcut descriptions gathered when the screen opens. Bare A1 SHALL carry those tables as structured sections into the reference screen rather than recognizing labels from rendered text. Every section SHALL use the same shared header component, bold theme accent, content adjacency, inter-section spacing, and active-section pinning as owned Settings. The changelog document SHALL retain its flat settings-aware Markdown presentation, and the hotkeys refinement SHALL NOT alter table content, wrapping, section order, or the pinned comparison presentation. Both screens SHALL omit the spacer, border, and heading rows that were feed chrome.

The screen SHALL be presented through the same owned route path as `/settings`: full-size top-left overlay with owned input coordination, pointer reporting enabled for its lifetime and disabled when it closes, mouse reports routed to the screen before any other surface, and the interrupt chord watched on raw input. The commands SHALL remain listed in the slash-command menu with their pinned descriptions. The `a1 pi` comparison profile and untouched pinned Pi SHALL retain the pinned in-feed documents; without the owned route host the commands remain pinned workflow routes. A1 SHALL NOT mutate installed Pi packages, their exported constructors, or their prototypes to implement the replacement.

#### Scenario: Invoke the changelog command in bare A1
- **WHEN** the user submits `/changelog` in bare A1
- **THEN** the `What's New` reference screen SHALL open with the complete pinned changelog, the editor SHALL be cleared, and the feed SHALL gain no rows
- **AND** pressing `Esc` SHALL close it and restore the session with its transcript position unchanged

#### Scenario: Invoke the hotkeys command in bare A1
- **WHEN** the user submits `/hotkeys` in bare A1
- **THEN** the `Keyboard Shortcuts` reference screen SHALL open with the bare-A1 Navigation, Editing, Other, Models dialog, and, when any exist, Extensions tables and the feed SHALL gain no rows
- **AND** each section label SHALL use the Settings bold accent and its table SHALL begin on the following row with no blank spacer
- **AND** scrolling within a section SHALL pin that section label as the first document row until the next section takes over
- **AND** adding another structured section SHALL require only section data, not a label-specific styling or pinning branch
- **AND** a keybinding configuration reloaded before the next invocation SHALL be reflected the next time the screen opens

#### Scenario: Scroll and close a reference command screen
- **WHEN** the changelog or hotkeys screen is open above an overflowing document
- **THEN** keyboard, wheel, rail hover, thumb drag, and track paging SHALL scroll the document as the reference screen specifies, no transcript scroll, selection, or control SHALL activate through the screen, and closing SHALL restore pointer reporting and the viewport as after `/settings`

#### Scenario: Invoke either command in the comparison profile
- **WHEN** the user submits `/changelog` or `/hotkeys` in `a1 pi`
- **THEN** the pinned workflow SHALL run and the pinned in-feed document with its spacer, borders, heading, Markdown, and chronological placement SHALL be appended exactly as before
