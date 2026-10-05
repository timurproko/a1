## Why

The root README is long enough that readers need a compact way to jump between its main tasks. The current local preview also resolves fragment-only links against the source-directory `<base>`, so clicking a section link opens a directory listing instead of scrolling the rendered preview.

## What Changes

- Add a centered navigator below the README badges for Install, Use, Update, Extensions, Develop, and Publish.
- Promote Update to a top-level section and move the terminal illustration above Install.
- Replace generic emoji with compact custom SVG icons whose geometric, monospaced treatment and light/dark colors match the existing A1 README artwork.
- Keep each icon and label clickable while limiting hover underlining to the text label.
- Make fragment-only links in the local README preview target the generated preview document while preserving source-relative image loading.
- Add focused regression coverage for the navigator structure, icon assets, headings, and preview fragment behavior.

## Capabilities

### New Capabilities

- `readme-section-navigation`: Branded README section navigation and correct fragment behavior in the local rendered preview.

### Modified Capabilities

None.

## Impact

- Changes root `README.md` and adds small owned assets under `docs/assets/readme/`.
- Changes `scripts/development/preview-readme.mjs` and focused tests for local preview behavior.
- Does not change product runtime behavior, installation commands, or release semantics.
