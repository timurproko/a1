## ADDED Requirements

### Requirement: Hyperlink decoration follows current visible link regions
Bare A1's custom fullscreen viewport SHALL keep file and URL hyperlink hover decoration confined to the display cells occupied by the corresponding link in the current presented frame. Moving, shortening, replacing, clipping, or removing a link SHALL leave neither its old hover underline nor its old explicit hyperlink target on unrelated text, blank padding, viewport controls, or dock chrome. Link-region changes SHALL be reconciled without requiring an additional pointer-motion report.

#### Scenario: Scroll a hovered link away from a stationary pointer
- **WHEN** wheel scrolling, keyboard navigation, scrollbar interaction, or followed output moves a link away from a stationary pointer
- **THEN** its former screen cells SHALL lose the old hyperlink decoration and explicit target
- **AND** hovering those cells SHALL reflect only their currently visible content

#### Scenario: Remove the last visible link
- **WHEN** scrolling or content replacement changes a frame containing links into a frame with no links
- **THEN** former link cells, including cells now painted as empty rows, SHALL have no stale link-hover underline or explicit target
- **AND** cleanup SHALL NOT depend on a link being present in the replacement frame

#### Scenario: Change a link's bounds without changing its target or row
- **WHEN** a link moves horizontally or changes displayed length on the same row while retaining its target and still containing the pointer
- **THEN** decoration SHALL match its new display-column bounds
- **AND** cells outside those bounds SHALL NOT retain the old link decoration or target

#### Scenario: Render multiple occurrences and wrapped links
- **WHEN** the same target occurs more than once or a link wraps across rows beside wide or combining graphemes
- **THEN** each visible occurrence and wrapped segment SHALL retain its own exact display-cell extent
- **AND** decoration SHALL NOT bridge intervening non-link text or split a grapheme's cells

#### Scenario: Change visible geometry without a hover report
- **WHEN** streaming reflow, resize, dock reallocation, sticky-row replacement, or overlay opening or closing changes visible link regions without a preceding hover-motion report
- **THEN** obsolete link regions SHALL still be cleared
- **AND** clipped or covered content SHALL NOT leave link decoration on the new foreground surface

### Requirement: Hyperlink cleanup survives presentation optimization
Terminal output for a hyperlink-cleanup transition SHALL preserve the clearing and repaint operations needed to remove obsolete decoration, including when the new frame has no explicit links. Scroll and damage optimizations SHALL account for both the previously presented link state and the desired frame. A cleanup transition SHALL publish complete current content without an observable blank intermediate frame or stale later repaint.

#### Scenario: Optimize a forced cleanup to a link-free frame
- **WHEN** a forced cleanup frame replaces previously linked content with plain content
- **THEN** rendering optimization SHALL NOT discard the required cleanup as a redundant clear
- **AND** the terminal SHALL receive the complete replacement content with its normal cursor and styling restoration

#### Scenario: Attempt regional scrolling with prior linked content
- **WHEN** a regional scroll optimization would move or erase rows that previously carried links, even if the incoming row changes contain no link sequences
- **THEN** the optimization SHALL be rejected unless preservation of link cleanup is proven for the complete affected region
- **AND** conservative fallback SHALL preserve complete current content

#### Scenario: Coalesce cleanup with streaming output
- **WHEN** a link cleanup and newer transcript or pointer state arrive before presentation
- **THEN** the resulting frame SHALL preserve cleanup and present the newest state
- **AND** a later queued frame SHALL NOT restore obsolete link decoration

#### Scenario: Render unchanged links and unrelated dock input
- **WHEN** pointer motion stays inside an unchanged link or ordinary dock input leaves transcript geometry and links unchanged
- **THEN** hyperlink handling SHALL NOT cause unconditional full-screen clearing or repaint of the stable transcript
- **AND** hyperlink tracking work SHALL remain bounded by visible changed content rather than total transcript length

### Requirement: Hyperlink cleanup preserves interaction and has physical-terminal acceptance
The fix SHALL preserve the existing file and URL link targets, activation policy, idle colors, semantic transcript text, selection and copy results, and non-link source styling. It SHALL NOT require disabling hyperlinks or changing user terminal settings. Its behavior changes SHALL remain scoped to bare A1's owned fullscreen viewport, leaving `a1 pi`, untouched Pi, and installed Pi packages unchanged.

Acceptance SHALL include deterministic link-region and terminal-output evidence plus user-controlled review of the exact built candidate in Windows Terminal. Physical evidence SHALL distinguish explicit OSC 8 links from terminal auto-detected URL and file-like text and record terminal version, geometry, relevant settings, candidate identity, and results.

#### Scenario: Select and release linked content
- **WHEN** the reader selects linked transcript content, scrolls during selection, releases the pointer, and copies
- **THEN** the accepted selection and copy semantics SHALL remain unchanged
- **AND** restoring ordinary link presentation SHALL NOT leave stale solid underlines outside current link regions

#### Scenario: Review the original symptom physically
- **WHEN** the exact candidate is exercised with long file and URL links, tool-output paths, stationary-pointer scrolling, and blank rows replacing linked content
- **THEN** unrelated text and empty rows SHALL remain free of ghost link-hover underlines
- **AND** real links SHALL retain their accepted appearance and activation behavior

#### Scenario: Physical results contradict automated checks
- **WHEN** deterministic tests pass but Windows Terminal still shows stale link-hover underlines on the candidate
- **THEN** acceptance SHALL remain incomplete
- **AND** the evidence SHALL identify whether the remaining case involves explicit hyperlinks or terminal auto-detection rather than claiming the visual bug is fixed

#### Scenario: Use a pinned comparison profile
- **WHEN** the user launches `a1 pi` or untouched Pi
- **THEN** this change SHALL NOT alter its rendering, hyperlink handling, or selection behavior
