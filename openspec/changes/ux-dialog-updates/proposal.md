## Why

Session Info currently takes over the terminal as a full-screen reference document, unlike Models and Skills. Sign-in and project-trust dialogs also have inconsistent heading and selected-row styles. Bring these requested UX updates together in one PR using the established dialog presentation.

## What Changes

- Replace bare A1's full-screen Session Info presentation with an in-place input-dock dialog, following Models and Skills rather than a floating overlay.
- Preserve the complete report, fresh per-open snapshots, section styling, long-path wrapping, scrolling, and close behavior within the smaller available rectangle.
- Keep the transcript and session footer visible and restore ordinary prompt input on close without appending report or status rows to the feed.
- Align Session Info key/value data to one shared left-aligned value column, reducing optional padding on narrow frames while retaining complete report values and file paths.
- Give sign-in method and provider selectors accent-bold Title Case headings without trailing colons, and standard selected-background rows with normal label text instead of accent-colored labels.
- Show configured provider status using a muted separator dot, success-green configured text and a trailing green checkmark; retain an alternate-method qualifier when applicable, while unconfigured rows remain muted.
- Omit the decorative preferred-partner badges beside OpenRouter and Radius in bare-A1 provider choices; retain provider names, real configuration status and actions, and leave comparison presentation pinned.
- Apply the same heading and selected-row hierarchy to project-trust dialogs, preserving startup-safe rendering before trust resolves. Align the in-session Saved decision and Current session values to one left-aligned column and omit the parenthesized folder suffix from Saved decision.
- Extend the same styling to every internal dialog, including nested provider authentication-method pickers, with Title Case headings without trailing colons and standard selected backgrounds.
- Give every provider login state the Thinking Level template: a live-themed accent title, muted description immediately beneath it, one blank row before an accent chevron input, one shared left inset, and standard rules/footer. Apply it to API keys, manual codes, OAuth/browser, device-code, informational, waiting, progress, and submitted states without provider-specific exceptions.
- Make Up/Down wrap through internal choice lists in both directions, including account/API-key providers, authentication methods, trust, Launcher, and Settings model/level/value/structured choices. Preserve search, paging, confirmation and cancel behavior.
- Leave Changelog, Keyboard Shortcuts, Models, Skills, authentication logic, trust policy, extension-authored content, and the `a1 pi` comparison profile unchanged apart from internal implementation prerequisites.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: present bare-A1 Session Info in place, standardize internal and nested dialog headings/selection styling, and provide consistent wraparound choice navigation.

## Impact

Session-shell route coordination, selectors and input-surface lifecycle; the composition-owned Session Info route adapter; owned sign-in/trust component adapters; startup-safe trust rendering; and focused shell/composition/component tests. No engine statistics, credential storage, trust decisions, settings, dependencies, or comparison-profile changes are intended.
