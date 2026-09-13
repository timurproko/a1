## ADDED Requirements

### Requirement: URL and file links preserve complete targets through layout
Bare A1 SHALL preserve the complete target of each supported HTTP or HTTPS URL occurrence across text wrapping, clipping, viewport scrolling, and terminal resizing, as it preserves the complete target of a file link. Every visible wrapped segment SHALL refer to the occurrence's full target, not a substring reconstructed from that screen row. Existing explicit link targets and styled Markdown labels SHALL remain authoritative; bare-URL detection SHALL NOT overwrite them or turn unrelated file-like or dotted code text into new URL links.

URL and file links SHALL retain their shared native-link presentation and activation behavior, with web links using the existing web-link color and file links using the existing file-link accent. Link handling SHALL preserve semantic text, Markdown/code formatting, punctuation outside a target, and copied content. A1 SHALL NOT shorten labels, insert detector-breaking characters into semantic content, disable real links, or require different terminal settings as a workaround.

#### Scenario: Wrap a long URL in tool output
- **WHEN** plain tool output contains one HTTP or HTTPS URL that wraps across multiple rows
- **THEN** every visible URL segment SHALL retain the complete original target
- **AND** continuation rows SHALL not lose link identity merely because they do not repeat the URL scheme

#### Scenario: Render an existing Markdown or file link
- **WHEN** a component supplies a styled link label with an explicit target, including a file target, that wraps or clips
- **THEN** each visible segment SHALL keep that explicit target and accepted source styling
- **AND** bare-URL recognition SHALL not nest a conflicting target inside it

#### Scenario: Render adjacent punctuation and repeated targets
- **WHEN** a URL is followed by sentence punctuation or unmatched closing delimiters, or the same target occurs twice with non-link text between occurrences
- **THEN** existing supported URL boundary semantics SHALL be preserved
- **AND** each occurrence SHALL have independent visible bounds without linking intervening text or punctuation outside the target

#### Scenario: Reflow a styled URL
- **WHEN** resize, streaming, or source styling changes where a URL wraps or splits into styled segments
- **THEN** the original complete target SHALL remain attached to every visible segment
- **AND** stale target bounds SHALL not survive on newly non-link cells

#### Scenario: Copy a wrapped link
- **WHEN** the reader selects and copies content spanning wrapped URL or file-link rows
- **THEN** copied content SHALL retain the existing semantic selection and newline behavior without presentation-only characters, target fragments substituted for labels, or viewport padding

#### Scenario: Render ordinary code
- **WHEN** content contains dotted identifiers, file names, or relative paths without an explicitly declared hyperlink or supported HTTP/HTTPS URL
- **THEN** URL handling SHALL preserve that text without inventing a web target
- **AND** host-hover candidate classification alone SHALL not change movement eligibility

### Requirement: Link cleanup preserves current content at every presentation boundary
A bare-A1 link-cleanup transition SHALL remove obsolete link decoration and explicit targets from former link cells while presenting the newest complete current content. Cleanup SHALL account for the previously presented and desired link occurrences, including links removed, moved, shortened, clipped, or covered without a new pointer-motion report. It SHALL survive coalesced frames and SHALL not be acknowledged solely because a render was requested or rows were composed.

Cleanup SHALL remain bounded to required affected rows and current content damage. It SHALL NOT introduce an ordinary-streaming full-screen clear, an independently exposed blank frame, or a later stale repaint. Existing conservative behavior for explicit hyperlinks, unsafe terminal content, and unproven movement SHALL remain in force. Stable link-free streaming and unrelated dock input SHALL retain their existing bounded work and paint behavior.

#### Scenario: Move a URL away from a stationary pointer
- **WHEN** followed output, wheel scrolling, keyboard navigation, or scrollbar interaction moves a URL away from a stationary pointer
- **THEN** its former cells SHALL show only their current content and link state
- **AND** unrelated text and blank rows SHALL not retain the former URL's underline

#### Scenario: Replace the last link without a hover report
- **WHEN** a linked region becomes plain text or blank rows without another pointer-motion report
- **THEN** required cleanup SHALL overwrite obsolete link state even though the new region contains no link
- **AND** absence of an earlier application-observed hover SHALL not be treated as proof that host decoration is absent

#### Scenario: Cover and reveal links
- **WHEN** a sticky prompt, bottom control, dock reallocation, or modal surface covers linked cells and later reveals the transcript
- **THEN** each resulting frame SHALL contain only current targets and decoration in the exposed link bounds
- **AND** covered content SHALL not leave an underline on the foreground control or surface

#### Scenario: Supersede a cleanup frame
- **WHEN** newer transcript, selection, or pointer state supersedes a frame for which cleanup is pending
- **THEN** the next published frame SHALL combine the outstanding cleanup with the newest eligible content
- **AND** an obsolete frame SHALL neither acknowledge that cleanup nor restore old rows

#### Scenario: Select and release a link
- **WHEN** a reader selects linked content, auto-scrolls during selection, releases, and copies
- **THEN** the existing held-selection and restored native-link behavior SHALL remain intact
- **AND** source colors, target bounds, semantic copy, and unrelated blank cells SHALL remain correct

#### Scenario: Type beside stable links
- **WHEN** same-height dock input changes while transcript content, geometry, and link occurrences remain unchanged
- **THEN** no hyperlink-driven full-screen clear or stable-transcript repaint SHALL occur

### Requirement: Rendering acceptance distinguishes content loss from host decoration
Acceptance of this change SHALL include deterministic content and terminal-protocol evidence plus user-controlled review of the exact built candidate in Windows Terminal. The evidence SHALL identify candidate and baseline builds, terminal version, geometry, relevant terminal settings and capabilities, and whether each reproduction uses explicit links, bare URL output, or host-only auto-detected text. It SHALL retain bounded, appropriately sanitized observations sufficient to distinguish semantic omission, stale cached rows, terminal cell/target errors, and host-only hover decoration.

The original disappearing-content and URL-underline findings SHALL remain unresolved until the corresponding exact-artifact review passes. A passing cell replay, fewer clears, or correct link colors alone SHALL NOT establish that native host decoration is fixed. The explicit `a1 pi` oracle and installed Pi packages SHALL remain untouched; only bare A1 SHALL acquire this URL/decorating behavior.

#### Scenario: Compare URL and file links physically
- **WHEN** the candidate is tested with long URL and file links, styled/wrapped labels, repeated targets, stationary-pointer scrolling, and links replaced by blank or ordinary text
- **THEN** real links SHALL preserve their accepted appearance and activation
- **AND** unrelated text and blank cells SHALL remain free of ghost underlines
- **AND** explicit and host-only cases that do not reproduce SHALL be recorded as such rather than claimed as repaired

#### Scenario: Review content across a complete run
- **WHEN** the candidate generates commentary, thinking, fenced code, multiple tools, structured edit output, and asynchronous renderer updates in a conversation with prior history
- **THEN** displayable content SHALL remain available under existing visibility and expansion settings during execution and after settlement
- **AND** no block SHALL require resize or reopen to recover a missed presentation

#### Scenario: Native underline persists despite passing replay
- **WHEN** replay shows correct cells and hyperlink bounds but Windows Terminal still leaves a stale underline
- **THEN** physical acceptance SHALL fail and the remaining host case SHALL be recorded
- **AND** implementation SHALL not silently substitute a different activation, label, or underline model or weaken the acceptance criterion

#### Scenario: Compare independent profiles
- **WHEN** the same declared workload is exercised through bare A1 and the explicit pinned comparison route
- **THEN** shared content and tool-rendering semantics SHALL match outside existing declared product differences
- **AND** the comparison route SHALL not acquire A1-specific URL decoration, viewport composition, or damage optimization
