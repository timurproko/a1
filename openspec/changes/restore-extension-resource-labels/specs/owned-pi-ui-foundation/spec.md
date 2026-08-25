## ADDED Requirements

### Requirement: Compact extension labels preserve source identity

The owned startup Extensions section SHALL use pinned Pi's compact naming rules
rather than reducing every loaded extension to the final segment of its entry
path.

#### Scenario: Show an extension supplied by an npm package

- **WHEN** an npm package supplies an extension below its package root
- **THEN** the compact label SHALL contain the configured npm package source and
  the meaningful entry suffix, omitting a terminal `index.ts` or `index.js`
- **AND** `npm:@narumitw/pi-statusline` loaded from `dist/index.ts` SHALL appear
  as `@narumitw/pi-statusline:dist`, not `dist`

#### Scenario: Show a package-root index

- **WHEN** an npm or Git package supplies its root `index.ts` or `index.js`
- **THEN** the compact label SHALL be the package identity without an `index`
  suffix

#### Scenario: Disambiguate local extension entries

- **WHEN** two visible non-package extensions would have the same compact leaf
  label
- **THEN** each label SHALL include the shortest trailing path that uniquely
  identifies it, with a terminal directory index omitted as pinned Pi omits it

#### Scenario: Keep hidden extensions out of label resolution

- **WHEN** a loaded extension is marked hidden
- **THEN** it SHALL remain absent from the startup Extensions section and SHALL
  NOT force a longer label for a visible extension
