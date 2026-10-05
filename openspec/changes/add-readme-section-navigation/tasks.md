## 1. Branded navigation assets

- [ ] 1.1 Add six compact A1-owned SVG icons for Install, Use, Update, Extensions, Develop, and Publish, with square terminal-inspired geometry and the established light/dark README colors.
- [ ] 1.2 Update the README navigator to use the owned icons inside each anchor, keep separators outside links, and verify hover decoration affects labels rather than icons while the complete item remains clickable.

## 2. README section structure

- [ ] 2.1 Promote Update to a top-level heading and include it in document-order navigation between Use and Extensions.
- [ ] 2.2 Move the terminal illustration above Install without duplicating it or changing the remaining large illustration sequence.

## 3. Local preview fragments

- [ ] 3.1 Rebase fragment-only links to the generated preview document without changing the source-directory base used by relative images or rewriting non-fragment links.
- [ ] 3.2 Add focused regression coverage for same-preview fragment resolution and preserved external/repository-relative destinations.

## 4. Validation

- [ ] 4.1 Add focused README structure coverage for all six destinations, matching headings, owned assets, placement, and accessible label/icon markup.
- [ ] 4.2 Render the README through the GitHub API preview, inspect the custom icons and terminal placement, and verify every navigator item scrolls within the same preview in the expected light/dark presentation.
