## Why

Session Info currently takes over the terminal as a full-screen reference document, unlike Models and Skills. Sign-in and project-trust dialogs also have inconsistent heading and selected-row styles. Bring these requested UX updates together in one PR using the established dialog presentation.

## What Changes

- Replace bare A1's full-screen Session Info presentation with an in-place input-dock dialog, following Models and Skills rather than a floating overlay.
- Preserve the complete report, fresh per-open snapshots, section styling, long-path wrapping, scrolling, and close behavior within the smaller available rectangle.
- Keep the transcript and session footer visible and restore ordinary prompt input on close without appending report or status rows to the feed.
- Give sign-in method and provider selectors accent-bold Title Case headings without trailing colons, and standard selected-background rows with normal label text instead of accent-colored labels.
- Apply the same heading and selected-row hierarchy to project-trust dialogs, preserving startup-safe rendering before trust resolves. Align the in-session Saved decision and Current session values to one left-aligned column and omit the parenthesized folder suffix from Saved decision.
- Leave Settings, Changelog, Keyboard Shortcuts, Models, Skills, authentication logic, trust policy, and the `a1 pi` comparison profile unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: present bare-A1 Session Info in place and standardize sign-in and project-trust headings and selected-row styling.

## Impact

Session-shell route coordination, selectors and input-surface lifecycle; the composition-owned Session Info route adapter; owned sign-in/trust component adapters; startup-safe trust rendering; and focused shell/composition/component tests. No engine statistics, credential storage, trust decisions, settings, dependencies, or comparison-profile changes are intended.
