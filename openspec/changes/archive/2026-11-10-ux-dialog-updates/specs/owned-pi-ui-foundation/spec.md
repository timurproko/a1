## MODIFIED Requirements

### Requirement: The session command opens a reference screen in bare A1
Bare A1 SHALL declare `/session` as an A1-owned replacement for the pinned in-feed session-information document. The owned route host SHALL claim the route ahead of the pinned workflow table, obtain a fresh structured session-information snapshot for each invocation, and open Session Info in the Agent input dock using the established in-place Models and Skills presentation, not full screen or as a floating overlay. Invoking the command SHALL append no document, status, checkmark, error, or placeholder row to the feed.

The screen SHALL use `Session Info` as its accent title. It SHALL present the optional session Name followed by File and ID as identity rows before the grouped report. All report key/value rows SHALL share a left-aligned value column at feasible widths, including identity and grouped values, while preserving nested label indentation and semantic roles. Alignment SHALL use the labels actually present and SHALL reduce optional padding on narrow frames before wrapping content. The session file value SHALL begin on its labelled row at the aligned column when space permits. When the complete value does not fit, it SHALL use the remaining visible columns before continuing the complete, untruncated value on subsequent rows; only a frame too narrow to leave any value column after the label MAY begin the value on the following row. `Messages`, `Tokens`, `Cache Warming`, and, when its existing condition is met, `Cost` SHALL be structured sections using the same shared bold yellow Markdown-heading role, one-cell left inset, content adjacency, inter-section spacing, and active-section pinning as the `Navigation` section of Keyboard Shortcuts and owned Settings. The report SHALL preserve the existing labels, values, calculations, conditional details, indentation, semantic label/value styles, complete value content across aligned wrapping, and group order.

The session screen SHALL retain the shared reference screen's keyboard, wheel, scrollbar rail, close, interrupt, resize, and viewport-restoration behavior within its input-dock rectangle. The transcript and ordinary session footer SHALL remain visible, and transcript pointer interaction outside the dialog SHALL remain available. Closing SHALL restore ordinary prompt input and focus without losing retained draft content or attachments. The `a1 pi` comparison profile SHALL keep the pinned `/session` workflow and chronological in-feed presentation and SHALL open no A1-owned session reference screen.

#### Scenario: Invoke the session command in bare A1
- **WHEN** the user submits `/session` in bare A1
- **THEN** the `Session Info` reference screen SHALL open in the input dock with a fresh snapshot, the editor SHALL be cleared, and the feed SHALL gain no rows
- **AND** closing the screen SHALL restore the prior session viewport without leaving a status or placeholder

#### Scenario: Render the session hierarchy
- **WHEN** the session report contains identity, message, token, cache-warming, and cost information
- **THEN** Name when present, File, and ID SHALL appear before the first section
- **AND** `Messages`, `Tokens`, `Cache Warming`, and `Cost` SHALL use the same shared section-header presentation as Keyboard Shortcuts' `Navigation` heading
- **AND** all existing report values, details, indentation, order, and conditional rows SHALL remain complete

#### Scenario: Render a long session file path
- **WHEN** the session file value is longer than the visible space remaining after `File:`
- **THEN** the value SHALL begin at the aligned value column after `File:`, reducing optional padding on narrow frames, and fill that row's remaining visible columns
- **AND** the rest of the complete value SHALL continue on following rows before the ID row without truncation or an intervening blank row

#### Scenario: Align report values
- **WHEN** Session Info presents identity, message, token, cache-warming, or cost label/value rows at a feasible width
- **THEN** the values SHALL begin in the same left-aligned column without right-aligning numeric values
- **AND** labels, nested indentation, semantic styles, calculations, optional details, and complete values SHALL remain intact
- **AND** constrained widths SHALL reduce optional alignment padding and wrap rather than truncate source content

#### Scenario: Omit conditional session information
- **WHEN** the session has no name and its existing cost and cache-waste condition does not require a Cost group
- **THEN** the Name row and Cost section SHALL be absent without blank placeholder content
- **AND** File, ID, Messages, Tokens, and Cache Warming SHALL retain their established values and order

#### Scenario: Reopen after session activity
- **WHEN** message, token, cost, or cache-warming state changes after the session screen was closed and the user invokes `/session` again
- **THEN** the reopened screen SHALL show a newly obtained snapshot rather than cached values from the earlier opening

#### Scenario: Scroll and close the session screen
- **WHEN** the session report overflows the available input-dock rectangle
- **THEN** keyboard, wheel, rail hover, thumb drag, and track paging SHALL scroll it with active section pinning
- **AND** Escape and the interrupt chord SHALL retain the shared reference-screen close and exit behavior without activating transcript controls through the dialog

#### Scenario: Invoke the session command in the comparison profile
- **WHEN** the user submits `/session` in `a1 pi`
- **THEN** the pinned workflow SHALL append the complete pinned session-information component at its chronological feed position
- **AND** no A1-owned reference screen SHALL open

#### Scenario: Keep conversation context visible
- **WHEN** Session Info is open in bare A1
- **THEN** its frame SHALL replace only the Agent input surface, with no full-screen takeover, floating panel, or dimmed backdrop
- **AND** the transcript and session footer SHALL remain visible with ordinary transcript scrolling, selection, and copying outside the dialog

#### Scenario: Resize and restore the input dock
- **WHEN** the terminal is compact or resizes while Session Info is open
- **THEN** the dialog SHALL stay bounded by the available input-dock dimensions with usable scrolling and close guidance
- **AND** closing SHALL restore ordinary prompt input and focus without losing any retained draft content or attachments

### Requirement: Bare-A1 project-trust dialogs use the standard dialog hierarchy

Both the pre-resource startup trust selector and the in-session project-trust selector SHALL use the established bare-A1 dialog hierarchy. Titles SHALL use bold accent styling and Title Case without a trailing colon: `Trust Project Folder?` at startup and `Project Trust` in-session. Selected choices SHALL use the shared selected-background role, an accent arrow, normal-text labels, and no selection-induced bold, matching the item-bounded highlight used by Skills rather than accent-colored labels alone. Top and bottom rules SHALL use the standard border role; ordinary path and label context SHALL remain muted; and shortcut rows SHALL use distinct dim key and muted action roles with whitespace-only entry gaps. The startup selector SHALL reproduce those fixed dark-dialog roles without consulting project settings, project themes, extensions, prompts, packages, skills, or post-trust components.

In the in-session selector, `Saved decision:` and `Current session:` SHALL remain muted labels while their decision values use the normal text role. Both values SHALL start in the same left-aligned column, padding after the shorter label. The saved-decision value SHALL omit any parenthesized folder-path suffix while retaining its actual resolved decision. Every selected trust option SHALL contain exactly one visible space between its arrow and label. The choice list SHALL NOT display a saved-decision checkmark; an exact saved choice SHALL instead be represented by the status line and initial active selection. The shortcut row SHALL be followed immediately by the bottom rule without an intervening blank row.

These presentation requirements SHALL NOT change trust outcomes, persistence, policy resolution, confirmation, exit/cancel behavior, terminal restoration, constrained-terminal fallback, or the explicit `a1 pi` comparison profile. In-session Up/Down navigation SHALL follow the internal choice-list wraparound policy.

#### Scenario: Ask for trust before project resources load

- **WHEN** bare A1 presents the pre-resource startup trust selector
- **THEN** its title SHALL be the accent-bold text `Trust Project Folder?` and its selected option SHALL use the standard selected background, accent arrow, and normal-text label
- **AND** its full-width rules SHALL use the standard border role
- **AND** its shortcut row SHALL present `↑↓ navigate`, `Enter select`, and `Esc exit` with the standard key/action roles and two-space entry gaps
- **AND** producing that frame SHALL not consult project-derived presentation or resources

#### Scenario: Show current project trust in-session

- **WHEN** bare A1 presents the in-session project-trust selector
- **THEN** the title SHALL be the accent-bold text `Project Trust` without a trailing colon, and the active selection, rules, and shortcut row SHALL use the same semantic roles as other standard dialogs
- **AND** `Saved decision:` and `Current session:` SHALL be muted while the value following each label SHALL use the normal text role
- **AND** both decision values SHALL begin in the same left-aligned column, with no parenthesized folder-path suffix after the saved decision
- **AND** the separate project-path context row and underlying saved/current trust decisions SHALL remain unchanged
- **AND** the shortcut row SHALL be directly adjacent to the bottom rule

#### Scenario: Select a trust option

- **WHEN** any in-session trust option is active
- **THEN** its visible row SHALL render the accent arrow, exactly one space, and the normal-text option label over the shared item-bounded selected background without selection-induced bold
- **AND** no option SHALL reserve a saved-marker gap or display a checkmark

#### Scenario: Open with an exact saved choice

- **WHEN** an in-session trust option exactly represents the saved decision
- **THEN** that option SHALL receive the initial active selection
- **AND** the saved-decision status line SHALL communicate persistence without adding a second marker to the choice list

#### Scenario: Constrain or close a trust dialog

- **WHEN** either trust surface is resized, navigated, confirmed, cancelled, exited, interrupted, or disposed
- **THEN** its existing choices, responsive priority, non-navigation key behavior, trust effects, and restoration lifecycle SHALL remain unchanged
- **AND** selected spans SHALL remain within the available width without wrapping or background leakage
- **AND** the `a1 pi` comparison presentation SHALL remain unchanged

## ADDED Requirements

### Requirement: Internal dialogs share style and wraparound choice navigation

Bare A1 SHALL use accent-bold Title Case headings without trailing colons, accent arrows, normal primary labels, muted metadata, and shared selected backgrounds for internal dialogs, including nested authentication choices. Up/Down SHALL wrap internal choice lists in both directions. Search, paging, section jumps, document scrolling, confirmation, cancellation, authentication/trust effects, extension-authored content, and comparison behavior SHALL otherwise remain unchanged.

#### Scenario: Open a nested authentication method picker

- **WHEN** an internal sign-in flow presents a provider-specific authentication-method selector such as Amazon Bedrock
- **THEN** its title SHALL use Title Case without a trailing colon and its active option SHALL use the same shared background and normal label styling as the top-level method picker
- **AND** provider names, acronyms, option wording, status, and nested return/cancel behavior SHALL retain their existing meaning

#### Scenario: Wrap provider and authentication choices

- **WHEN** Up is pressed on the first choice or Down on the last choice in an account-provider, API-key-provider, authentication-method, or in-session trust selector
- **THEN** selection SHALL move to the last or first choice respectively and remain visible
- **AND** only currently filtered matches SHALL participate, while empty or one-choice lists SHALL remain safe

#### Scenario: Wrap Launcher choices

- **WHEN** Up is pressed on the first Launcher result or Down on its last result
- **THEN** selection SHALL wrap to the opposite end of the current search results without opening an application until confirmed

#### Scenario: Wrap Settings choices

- **WHEN** Up or Down crosses a choice boundary in Settings, Default Model, either Thinking Level step, a value menu, or a structured choice dialog
- **THEN** selection SHALL wrap to the opposite end of the current selectable choices and remain visible
- **AND** filtered results, effective-value indicators, save/cancel, paging, and section-jump behavior SHALL retain their existing semantics

#### Scenario: Keep non-choice scrolling and external content unchanged

- **WHEN** the user scrolls a document, uses a paging or section-jump shortcut, or interacts with comparison-profile or extension-authored content
- **THEN** the internal choice-list wraparound policy SHALL NOT alter that behavior

### Requirement: Bare-A1 sign-in selectors use standard dialog styling

Bare A1's sign-in method and provider selectors SHALL use accent-bold Title Case headings without trailing colons. Selected rows SHALL use the shared item-bounded selected background, an accent arrow, normal primary text, muted metadata, and no selection-induced bold, matching Skills. Authentication behavior, search, status indicators, cancellation, and the `a1 pi` comparison presentation SHALL remain unchanged. Up/Down SHALL follow the internal choice-list wraparound policy.

#### Scenario: Choose a sign-in method

- **WHEN** bare A1 opens the sign-in method selector
- **THEN** its title SHALL be `Select Authentication Method` in the standard accent-bold style without a trailing colon
- **AND** its active account or API-key choice SHALL use the shared selected background rather than accent-colored label text alone
- **AND** its option wording and selection behavior SHALL remain unchanged

#### Scenario: Choose a sign-in provider

- **WHEN** bare A1 presents the account or API-key provider selector
- **THEN** its title SHALL be `Select Provider to Configure` in the standard accent-bold style without a trailing colon
- **AND** the active provider SHALL use the shared selected background with normal primary text and muted configuration metadata
- **AND** configured-state markers, provider names, search, result counts, navigation, and nested cancel/back behavior SHALL retain their existing meaning

#### Scenario: Move or clip selection

- **WHEN** a sign-in selection changes, is filtered, or is rendered at a narrow width
- **THEN** only the active item span from its arrow through its final visible content cell SHALL receive the selected background
- **AND** the span SHALL stay within the available width without wrapping, stale highlights, or background leakage
- **AND** the selected appearance SHALL resolve through the same live semantic roles as Skills and Models

#### Scenario: Keep authentication and profile behavior intact

- **WHEN** a sign-in choice starts, completes, fails, or cancels authentication
- **THEN** credential handling, status, parent restoration, and ordinary prompt restoration SHALL remain unchanged
- **AND** `a1 pi` SHALL retain its pinned heading and selection presentation
