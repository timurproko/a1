## MODIFIED Requirements

### Requirement: The changelog and hotkeys commands open reference screens in bare A1
Bare A1 SHALL declare `/changelog` and `/hotkeys` as A1-owned replacements for the
pinned in-feed changelog and keyboard-shortcut documents. The owned route host SHALL
claim both routes ahead of the pinned workflow table, so invoking either in bare A1
opens the A1-owned reference screen full screen over the session and appends no
document, status, checkmark, or error row to the feed.

`/changelog` SHALL open the screen titled `Changelog` with the packaged, manually
reviewed A1 release-note history newest first. It SHALL read only the deterministic
local package resource and SHALL NOT query GitHub, npm, or another network service.
`/hotkeys` SHALL open the screen titled `Keyboard Shortcuts` with the bare-A1
keybinding-derived tables the in-feed presenter produced for the `a1` profile,
including the current editor keybinding configuration and extension shortcut
descriptions gathered when the screen opens. Bare A1 SHALL carry those tables as
structured sections into the reference screen rather than recognizing labels from
rendered text. Every section SHALL use the same shared header component, bold yellow
Markdown-heading role, one-cell left inset, content adjacency, inter-section spacing,
and active-section pinning as owned Settings. One blank row SHALL separate the main
screen title from the first section. The changelog document SHALL retain its flat
settings-aware Markdown presentation, and the hotkeys refinement SHALL NOT alter
table content, wrapping, section order, or the pinned comparison presentation. Both
screens SHALL omit the spacer, border, and heading rows that were feed chrome.

The `a1 pi` comparison profile SHALL keep the pinned Pi `/changelog` workflow,
complete pinned Pi changelog, and in-feed presentation. It SHALL NOT read A1's
release-note acknowledgement or substitute A1 release notes for Pi's.

#### Scenario: Invoke the changelog command in bare A1
- **WHEN** the user submits `/changelog` in bare A1
- **THEN** the `Changelog` reference screen SHALL open with the complete packaged A1 release-note history in newest-first order, the editor SHALL be cleared, and the feed SHALL gain no rows

#### Scenario: Use changelog without network access
- **WHEN** the user opens `/changelog` while GitHub and npm are unavailable
- **THEN** the reviewed packaged notes SHALL remain available without a network request

#### Scenario: Invoke the hotkeys command in bare A1
- **WHEN** the user submits `/hotkeys` in bare A1
- **THEN** the `Keyboard Shortcuts` reference screen SHALL open with structured keybinding-derived sections, the editor SHALL be cleared, and the feed SHALL gain no rows

#### Scenario: Scroll and close a reference command screen
- **WHEN** the changelog or hotkeys screen is open above an overflowing document
- **THEN** keyboard, wheel, rail hover, thumb drag, and track paging SHALL scroll the document as the reference screen specifies, no transcript scroll, selection, or control SHALL activate through the screen, and closing SHALL restore pointer reporting and the viewport as after `/settings`

#### Scenario: Invoke either command in the comparison profile
- **WHEN** the user submits `/changelog` or `/hotkeys` in `a1 pi`
- **THEN** the pinned workflow SHALL retain its pinned Pi content and in-feed presentation and SHALL open no A1-owned reference screen

### Requirement: Startup release notes open as a reference screen in bare A1
A stable bare-A1 package SHALL carry one reviewed note whose exact stable semantic
version matches the package version. On the first interactive bare-A1 launch for
which that note is not durably acknowledged, A1 SHALL render its first input-ready
frame and then automatically open that exact note in the existing full-screen
`What's New` reference screen. Non-interactive installation and update commands
SHALL NOT launch a UI. A development preview, a stable package without a valid
matching resource, and `a1 pi` SHALL NOT automatically open A1 release notes.

The automatic screen SHALL use the ordinary owned-route lifecycle and SHALL append no
release-note rows, status, or notice to the transcript. A project-trust prompt or
another startup/safety modal SHALL keep priority; the pending note SHALL open in the
next available owned-route slot after that modal closes rather than replacing it or
being discarded. A1 SHALL mark the exact stable version acknowledged only after the
screen rendered successfully and the user closed it. Load/render failure or process
exit before close SHALL leave it pending. The versioned acknowledgement SHALL be
bounded, atomic, product-owned, scoped to the A1 profile, monotonic across downgrades,
and independent of Pi's `LastChangelogVersion` and `collapseChangelog` settings. A
bounded claim SHALL prevent concurrent launches of the same profile from presenting
the same pending note simultaneously and SHALL recover a stale claim.

Bare A1 SHALL not turn pinned Pi startup changelog diagnostics into its release-note
notice or screen. The `a1 pi` comparison profile SHALL preserve Pi's pinned expanded
or collapsed startup changelog behavior and acknowledgement unchanged.

#### Scenario: Start bare A1 after an upgrade with the changelog expanded
- **WHEN** bare A1 starts from stable `0.2.2`, the package carries reviewed note `0.2.2`, that version is not acknowledged, and Pi's `collapseChangelog` setting is off
- **THEN** A1 SHALL paint an input-ready shell frame and then open the `0.2.2` note in the `What's New` screen without adding transcript content or showing the former transient notice

#### Scenario: Start bare A1 with the changelog collapsed
- **WHEN** the same stable note is pending and Pi's `collapseChangelog` setting is on
- **THEN** A1 SHALL open the same reviewed A1 note in the `What's New` screen because Pi's collapse preference does not control product release notes

#### Scenario: Close the automatic release note
- **WHEN** the matching automatic note rendered successfully and the user closes it
- **THEN** A1 SHALL atomically acknowledge `0.2.2`, restore the session surface, and SHALL not auto-open that note on later launches of the same profile

#### Scenario: A modal is already presented
- **WHEN** the matching note is pending while project trust or another startup/safety modal is presented
- **THEN** A1 SHALL leave that modal in place and SHALL open the note in the next safe owned-route slot after the modal closes

#### Scenario: Continue working after the startup notice
- **WHEN** assistant or tool content is added while the automatic full-screen note is open
- **THEN** that content SHALL remain ordinary transcript content behind the owned route, the note SHALL remain outside the transcript, and closing the note SHALL restore the current session surface without inserting a notice

#### Scenario: Presentation does not complete
- **WHEN** the note cannot load or render, its process exits before close, or its presentation claim becomes stale
- **THEN** A1 SHALL not record a false acknowledgement, SHALL bound any diagnostic, and SHALL allow a later launch to retry safely

#### Scenario: Two sessions start concurrently
- **WHEN** two bare-A1 launches of the same profile observe the same pending stable note
- **THEN** at most one live launch SHALL claim its automatic presentation, and an abandoned bounded claim SHALL not suppress the note permanently

#### Scenario: Launch a development preview
- **WHEN** bare A1 starts from `0.2.3-dev.612` while the package carries reviewed stable history
- **THEN** no A1 release note SHALL auto-open and no stable acknowledgement SHALL be consumed or created

#### Scenario: Launch an older stable version
- **WHEN** a user temporarily launches a stable version older than the acknowledged release
- **THEN** A1 SHALL not move the acknowledgement backwards or repeatedly reopen the older note

#### Scenario: Open release notes on request
- **WHEN** the user invokes `/changelog` before or after the automatic note is acknowledged
- **THEN** the `Changelog` reference screen SHALL open with complete packaged A1 release-note history and the feed SHALL gain no rows

#### Scenario: Start the comparison profile after an upgrade
- **WHEN** `a1 pi` starts under conditions that would make bare A1's current stable note pending
- **THEN** no A1 note or acknowledgement SHALL be used, and Pi's pinned expanded or collapsed startup changelog behavior SHALL remain unchanged
