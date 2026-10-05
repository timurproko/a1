## Why

The root README is long enough that readers need a compact way to jump between its main tasks. Its large section-specific illustrations add vertical weight, and the local preview resolves fragment-only links against the source-directory `<base>`, opening a directory listing instead of scrolling the rendered preview.

## What Changes

- Add a centered text navigator below the README badges for Install, Launch, Update, Extensions, Develop, and Publish.
- Present all six destinations as top-level sections.
- Replace section-specific illustrations with one thin, reusable, theme-aware animated ASCII separator between sections.
- Render command blocks as plain text so GitHub does not apply misleading shell-keyword colors.
- Make fragment-only links in the local README preview target the generated preview document while preserving source-relative image loading.

## Capabilities

### New Capabilities

- `readme-section-navigation`: Clear README section navigation, lightweight section separation, and correct fragment behavior in the local rendered preview.

### Modified Capabilities

None.

## Impact

- Changes root `README.md` and adds owned separator artwork under `docs/assets/readme/`.
- Changes `scripts/development/preview-readme.mjs`; presentation and navigation are validated through the GitHub-rendered local preview rather than structure-coupled README tests.
- Does not change product runtime behavior, installation commands, or release semantics.
