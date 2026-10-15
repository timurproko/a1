## MODIFIED Requirements

### Requirement: Bare A1 presents resident A1 sessions as tabs
Bare `a1` SHALL present a v2-style one-row tab strip at the top of the terminal and the viewed tab's terminal surface in all remaining rows. Each tab SHALL be an independent resident terminal session running the complete A1 owned UI with its own Pi agent session, extensions, transcript, editor, queue, model, thinking level, notices, and cwd. Only the viewed tab SHALL receive keyboard, paste, focus, and surface mouse input. The strip SHALL be present even when a single tab exists, and SHALL remain with a `+` chip and a hint when no tab exists. The tab chip SHALL be the resident session name's visible location, and the viewed resident shell SHALL NOT repeat that name in its inner footer; direct single-agent and comparison launches without a tab strip SHALL retain their existing footer session name. Extension components using the certified text-terminal contract SHALL behave as in direct single-agent bare A1 on Windows x64, macOS arm64, and Linux x64; inline image protocols SHALL use the text fallback. `a1 solo` and `a1 pi` SHALL NOT present a tab strip.

#### Scenario: Explicit solo launch
- **WHEN** the user runs `a1 solo`
- **THEN** A1 SHALL launch one direct single-agent owned UI without resident infrastructure or a Tabs settings section

#### Scenario: First launch with no tabs
- **WHEN** the user runs bare `a1` and the profile has no resident tabs
- **THEN** A1 SHALL create one A1 tab in the launch cwd and view it

#### Scenario: Resident session name is not duplicated
- **WHEN** a named resident tab is viewed and its inner footer renders repository, branch, or pull-request context
- **THEN** the tab chip SHALL show the session name and the inner footer SHALL omit the duplicate name while preserving its other context

#### Scenario: Direct session keeps its footer name
- **WHEN** `a1 solo` or a resident fallback runs a named direct session without a tab strip
- **THEN** the footer SHALL continue to show the session name

#### Scenario: Two tabs keep separate state
- **WHEN** the user types a draft in tab 1, switches to tab 2, prompts it, and switches back
- **THEN** tab 1 SHALL show its transcript, scroll position, and draft unchanged
- **AND** the prompt SHALL have reached only the agent of tab 2

#### Scenario: Switch while both agents work
- **WHEN** the user switches tabs while both agents stream
- **THEN** only the viewed surface and input target SHALL change, and both agents SHALL continue without pause or restart

#### Scenario: Extension custom UI in a tab
- **WHEN** an extension renders a custom interactive component using the certified text-terminal contract
- **THEN** keyboard, mouse, paste, selection, clipboard, hyperlinks, cursor, Unicode, and alternate-screen behavior SHALL match direct single-agent bare A1 on the same platform
- **AND** an inline-image request SHALL use the existing text fallback

#### Scenario: Pi comparison profile
- **WHEN** the user runs `a1 pi`
- **THEN** no tab strip, resident server, holder, or tab bridge SHALL be involved
