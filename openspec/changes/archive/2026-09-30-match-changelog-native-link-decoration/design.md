## Context

Bare A1 renders `/changelog` and startup release notes in the shared full-screen reference app. The changelog provider obtains styled rows from Pi's Markdown component. Those rows contain OSC 8 hyperlink targets plus explicit SGR underline sequences, so Windows Terminal displays a solid underline even when the pointer is elsewhere.

Agent transcript rows already pass through `nativeHyperlinkStyle`. That shared transform retains tightly bounded OSC 8 targets and link foregrounds while removing explicit underline controls, allowing Windows Terminal to provide its native dotted idle decoration and solid hover decoration. Changelog reference rows currently bypass that transform.

## Goals / Non-Goals

**Goals:**
- Give bare-A1 changelog links the same dotted-at-rest, solid-on-hover appearance as links in agent content.
- Preserve labels, colors, targets, wrapping, scrolling, activation, and semantic text.
- Apply the behavior to both `/changelog` and startup release-note screens.

**Non-Goals:**
- Changing Markdown link rendering globally or changing hotkeys/reference-screen chrome.
- Reimplementing terminal hover state in A1.
- Changing `a1 pi`, Pi packages, release-note text, or terminal configuration.

## Decisions

### D1. Normalize rows at the bare-A1 changelog provider boundary

The changelog provider will pass each rendered Markdown row through the existing `nativeHyperlinkStyle` transform before supplying it to the reference screen. This is the narrow point shared by complete and startup changelog documents and avoids changing generic reference-screen behavior or pinned comparison rendering.

*Alternative:* normalize every row in `ReferenceScreenApp`. Rejected because hotkeys and future reference documents should not silently acquire changelog-specific hyperlink policy.

### D2. Keep terminal-native hover ownership

A1 will preserve OSC 8 boundaries and remove the Markdown component's explicit underline rather than synthesize dotted and hover styles itself. This matches agent content and lets the terminal switch from its idle decoration to its hover decoration.

*Alternative:* emit an SGR dotted underline. Rejected because an explicit underline competes with terminal-native hover presentation and duplicates the existing shared policy.

### D3. Verify protocol output and routed presentation

Focused tests will prove that changelog links retain their exact OSC 8 target and visible text but no longer contain the explicit solid-underline controls used by Markdown. Route-level coverage will verify that the bare-A1 changelog screen receives the normalized rows, while existing comparison-profile tests protect pinned behavior.

## Risks / Trade-offs

- [Terminal-specific native appearance varies] → retain the established agent-content OSC 8 policy rather than defining new terminal-specific styling.
- [A row transform could alter ANSI state] → use the existing tested helper and assert visible content, target boundaries, and absence of explicit underline controls.
- [Applying the policy too broadly could affect other screens] → transform only the composed bare-A1 changelog provider.

## Migration Plan

Additive presentation correction with no stored state or data migration. Reverting restores the prior explicit Markdown underline.

## Open Questions

_None._
