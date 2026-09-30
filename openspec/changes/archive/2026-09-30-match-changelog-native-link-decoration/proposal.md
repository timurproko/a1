## Why

Links in the bare-A1 changelog reference screen keep Markdown's explicit solid underline, while links in agent content defer decoration to the terminal and therefore appear dotted at rest and solid only on hover. The inconsistent solid treatment makes the changelog look permanently hovered, as shown in the reported Windows Terminal screenshot.

## What Changes

- Apply the existing terminal-native hyperlink presentation to changelog document rows before the reference screen displays them.
- Preserve every changelog link label, color, target, wrapping, scrolling, and activation behavior while removing only the renderer-owned solid underline.
- Cover both the complete `/changelog` history and startup release-note documents, which share the same changelog provider.
- Keep the `a1 pi` comparison profile and non-changelog reference content unchanged.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `owned-pi-ui-foundation`: Changelog reference-screen links use the same terminal-native idle and hover decoration as agent-content links in bare A1.

## Impact

- Bare-A1 changelog provider composition and focused rendering/reference-screen tests.
- No release-note content, URL target, input behavior, terminal setting, or pinned Pi rendering change.
