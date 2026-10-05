# readme-section-navigation Specification

## Purpose
Defines clear navigation among the root README's primary task sections, lightweight section separation, and correct fragment behavior in the local GitHub-rendered preview.

## Requirements

### Requirement: The README exposes direct navigation to every stable task area

The root README SHALL present a centered text navigator below its badges with destinations for Install, Launch, Update, Extensions, Develop, and Publish in document order. Each destination SHALL target a matching top-level heading.

#### Scenario: Reader selects a primary task

- **WHEN** a reader selects any navigator label
- **THEN** the document SHALL navigate to the matching top-level section without requiring the reader to scroll through intervening content

#### Scenario: Reader scans the task hierarchy

- **WHEN** a reader scans the README's primary tasks
- **THEN** Install, Launch, Update, Extensions, Develop, and Publish SHALL appear as top-level sections in navigator order

### Requirement: Section separators and commands match their intended presentation

The README SHALL place the same compact ASCII `* * *` separator between each adjacent pair of primary task sections instead of section-specific illustrations. The separator SHALL use light and dark artwork colors consistent with the retained animated waves footer, SHALL animate the three stars in sequence when motion is allowed, and SHALL show a static ornament when reduced motion is requested. Command examples SHALL use plain-text rendering so syntax highlighting does not assign semantic colors to ordinary command words. Changing presentation SHALL NOT change copyable command bytes.

#### Scenario: Separator renders under user preferences

- **WHEN** the README is viewed in light mode, dark mode, or with reduced motion enabled
- **THEN** every primary section boundary SHALL show the corresponding animated or static three-star separator while the animated waves footer remains present

#### Scenario: Reader copies a command

- **WHEN** GitHub renders and the reader copies any command example
- **THEN** its command text SHALL remain unchanged and SHALL not use shell-keyword syntax coloring

### Requirement: Local preview fragments remain within the rendered document

The local README preview SHALL preserve repository-relative image loading from the Markdown source location while resolving fragment-only destinations against the generated preview document. Selecting a valid section fragment SHALL use native same-document navigation and SHALL NOT open the source directory. Links that are not fragment-only SHALL retain their rendered destinations.

#### Scenario: Reader selects a section in local preview

- **WHEN** the generated local preview is open and the reader selects `#install` or another valid section fragment
- **THEN** the browser SHALL remain on the generated preview page, update to that fragment, and scroll to the matching heading

#### Scenario: Preview contains other links and relative images

- **WHEN** the preview renders repository-relative images, external links, and non-fragment repository links
- **THEN** the images SHALL continue to load from the source checkout and non-fragment destinations SHALL remain unchanged
