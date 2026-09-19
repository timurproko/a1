## Why

Bare A1 presents `/changelog`, `/hotkeys`, and the startup `What's New` release notes as long persistent documents inside the agent feed. A multi-release changelog pushes the conversation off screen, leaves a `Jump to bottom` control over reference text, and stays in the transcript for the rest of the session. The proven `D:/Backups/pi/v2` extension shows the same content as a dedicated full-screen reference screen instead: it opens over the session, scrolls with the keyboard, wheel, and scrollbar, and closes with `Esc`, leaving the feed untouched. Bare A1 already has that shape for `/settings` through its owned route host and app host, but the two reference commands and the startup notes still use the pinned in-feed presentation.

## What Changes

- Add one reusable A1-owned reference screen app: a full-screen, read-only, scrollable document framed between two border-coloured rules as in v2, led by a bold accent title row, with a bottom hint line rendered from its declared shortcuts, and the shared transcript scrollbar rail honoring the existing `scrollbarAppearance`, `scrollbarStyle`, and `scrollbarSpeed` settings. `↑`/`↓`, `PageUp`/`PageDown`, `Home`/`End`, wheel, rail hover, thumb drag, and track paging scroll it; `Esc` closes it; the interrupt chord behaves as on the settings screen.
- Declare `/changelog` and `/hotkeys` in bare A1 as A1-owned replacements for the pinned in-feed documents: the owned route host claims both routes and opens the reference screen titled `What's New` with the complete pinned changelog Markdown, or `Keyboard Shortcuts` with the existing bare-A1 keybinding-derived tables including extension shortcuts, rendered through the same settings-aware Markdown presentation the feed used. Neither command appends a document, status, or checkmark row to the feed.
- Present startup release notes the same way: when the pinned changelog startup lifecycle reports new entries since the last acknowledged version and the changelog is not collapsed, bare A1 shows the compact `What's New` / `Run /changelog to view the full release notes.` hint in the feed and opens the reference screen once with exactly those new entries, provided no other modal is presented. A collapsed changelog keeps its hint-only presentation, and the acknowledged-version bookkeeping is unchanged.
- Keep the `a1 pi` comparison profile and untouched pinned Pi on the in-feed presentation: without the owned route host the commands remain pinned workflow routes with their transcript documents, and the startup notes remain the pinned expanded or collapsed transcript block.
- Record both commands as declared bare-A1 replacements in the feature-adoption matrix and presenter-ownership inventory so parity classification treats the screens as expected rather than as divergence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-apps`: Add the reusable read-only reference screen app, its scrolling and pointer behavior, and the route input a shell may hand a route surface when it opens it with a caller-supplied document.
- `owned-pi-ui-foundation`: Declare the `/changelog` and `/hotkeys` reference screens and the startup `What's New` screen as bare-A1 replacements for the pinned in-feed documents, and require the comparison profile to preserve pinned behavior.

## Impact

Implementation will primarily affect the owned app layer (`src/ui/apps/contracts.ts` for the optional route input, one new `src/features/owned-ui/reference-screen-app.ts`), the owned route host in `src/composition/settings-route-host.ts` and its wiring in `src/composition/owned-ui.ts`, the session shell's slash dispatch and startup diagnostic handling in `src/app/session-shell/session-shell.ts` and `session-shell-root.ts`, and line-rendering helpers beside the existing `createPiShellChangelog`/`createPiShellHotkeys` presenters in `src/integrations/pi/components/shell-presenters-info.ts`. The engine's changelog reader, the `changelog-collapsed`/`changelog-expanded` diagnostics, the last-version bookkeeping, the pinned workflow table, and the autocomplete command list are reused unchanged.

No engine execution, provider protocol, session persistence, or Pi settings storage changes. Installed Pi packages, their exported constructors, and their prototypes are not mutated. The `a1 pi` comparison route keeps its pinned in-feed changelog and hotkeys documents. This change contains planning artifacts only, not implementation.
