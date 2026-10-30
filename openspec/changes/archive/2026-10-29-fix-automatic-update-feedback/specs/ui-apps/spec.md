## MODIFIED Requirements

### Requirement: Changelog reference documents support owned text selection

The owned reference-screen app SHALL make document text selectable when it presents the Changelog route, including the startup `What's New` document. It SHALL support pointer drag selection, double-click word selection, and triple-click line selection using terminal-cell and ANSI-aware boundaries, paint the retained selection through the shared component-owned blue text-selection surface, and extract plain text without rules, footer guidance, scrollbar cells, style sequences, or terminal padding. Hotkeys, Session Info, and other reference-screen routes SHALL retain their existing non-selectable pointer behavior unless separately opted in.

The selection SHALL stay anchored to document rows while keyboard, wheel, or scrollbar scrolling changes the visible window. The scrollbar rail SHALL retain pointer precedence over document selection, resize SHALL retain only selection that still maps to the same document text, and every frame SHALL preserve its requested dimensions.

On completion of a nonempty selection, the screen SHALL read the live `fullscreenCopyOnSelect` value. When enabled it SHALL submit the selected text to the existing bounded clipboard route and, when that route accepts the submission, show a transient accent `Copied N chars to clipboard` acknowledgement right-aligned on the final document row above the footer rule for the shared one-second lifetime. A newer automatic copy SHALL replace the prior acknowledgement and restart its lifetime; closing the screen SHALL cancel it. The acknowledgement SHALL remain presentation-only, SHALL NOT enter selection extraction or clipboard text, SHALL stop before the scrollbar cell, and SHALL clip safely on narrow screens. When automatic copy is disabled the screen SHALL retain the selection without writing the clipboard or showing the acknowledgement. `Ctrl+C` with a nonempty selection SHALL copy explicitly, clear the selection, and consume the interrupt without changing its established presentation behavior. `Ctrl+C` with no selection SHALL preserve the screen host's existing behavior: a close-enabled standalone Changelog may close, while a pinned resident Changelog keeps its established two-press application exit chord.

#### Scenario: Match Agent selected-text styling

- **WHEN** Changelog or `What's New` retains an ordinary text selection
- **THEN** the selected cells SHALL use the same shared blue component background as Agent selected text
- **AND** Markdown foregrounds, links, and exact frame dimensions SHALL remain intact

#### Scenario: Automatically copy a Changelog drag

- **WHEN** `Copy on select` is enabled and the reader completes a nonempty drag across Changelog document text
- **THEN** the selected plain text SHALL be written once to the clipboard
- **AND** the screen SHALL retain the painted selection
- **AND** the screen SHALL show `Copied N chars to clipboard` in the accent role above its footer for one second

#### Scenario: Retain selection without automatic copy

- **WHEN** `Copy on select` is disabled and the reader completes a Changelog word, line, or drag selection
- **THEN** the screen SHALL retain and paint the selection without writing the clipboard or showing a copy acknowledgement
- **AND** pressing `Ctrl+C` SHALL write that text once and clear the selection

#### Scenario: Replace a current copy acknowledgement

- **WHEN** another automatic Changelog copy completes while an acknowledgement is visible
- **THEN** the new selected-character count SHALL replace the old message
- **AND** the one-second lifetime SHALL restart without changing the retained selection

#### Scenario: Preserve the resident interrupt chord

- **WHEN** the pinned Changelog tab has no active selection and receives `Ctrl+C`
- **THEN** the reference screen SHALL leave the input unclaimed so the existing resident interrupt chord applies

#### Scenario: Select while the document scrolls

- **WHEN** a Changelog selection spans document rows and the reader scrolls or resizes the screen
- **THEN** visible selected cells and copied text SHALL continue to describe the same document rows and columns
- **AND** scrollbar interaction SHALL NOT become document selection
