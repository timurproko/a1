## Purpose

Defines branded navigation among the root README's primary task sections and correct fragment behavior in the local GitHub-rendered preview.

## ADDED Requirements

### Requirement: The README exposes direct navigation to every primary task section

The root README SHALL present a centered navigator below its badges with destinations for Install, Use, Update, Extensions, Develop, and Publish in document order. Each destination SHALL target the matching top-level heading. Update SHALL be a top-level section rather than a subsection of Use. The terminal illustration SHALL appear after the navigator and before Install, exactly once.

#### Scenario: Reader selects a primary task

- **WHEN** a reader selects any navigator label
- **THEN** the document SHALL navigate to the matching top-level section without requiring the reader to scroll through intervening content

#### Scenario: Reader navigates to Update

- **WHEN** a reader selects Update
- **THEN** the document SHALL navigate to a top-level Update section between Use and Extensions

### Requirement: Navigation icons use the owned A1 visual language

Each navigator destination SHALL use a distinct owned SVG icon that communicates its section and uses compact square, terminal-inspired geometry consistent with the existing README illustrations. Icons SHALL use the established A1 light and dark artwork colors without depending on emoji rendering or a third-party icon package. Each icon and label SHALL share one clickable destination, while link underlining SHALL be visually limited to label text rather than the icon.

#### Scenario: Navigator renders in light or dark mode

- **WHEN** GitHub renders the README under either supported color preference
- **THEN** all six icons SHALL remain legible, visually consistent with the large A1 illustrations, and paired with readable section labels

#### Scenario: Reader hovers a navigation item

- **WHEN** a pointer hovers a navigator destination
- **THEN** the text label SHALL receive normal link decoration while the icon remains undecorated and the icon-plus-label target remains clickable

### Requirement: Local preview fragments remain within the rendered document

The local README preview SHALL preserve repository-relative image loading from the Markdown source location while resolving fragment-only destinations against the generated preview document. Selecting a valid section fragment SHALL use native same-document navigation and SHALL NOT open the source directory. Links that are not fragment-only SHALL retain their rendered destinations.

#### Scenario: Reader selects a section in local preview

- **WHEN** the generated local preview is open and the reader selects `#install` or another valid section fragment
- **THEN** the browser SHALL remain on the generated preview page, update to that fragment, and scroll to the matching heading

#### Scenario: Preview contains other links and relative images

- **WHEN** the preview renders repository-relative images, external links, and non-fragment repository links
- **THEN** the images SHALL continue to load from the source checkout and non-fragment destinations SHALL remain unchanged
