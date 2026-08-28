## Why

Bare `a1` loads the same Pi extension packages as the pinned engine, but its
startup Extensions section throws away each extension's package provenance and
reduces the entry path to its final segment. An npm extension loaded from
`@narumitw/pi-statusline/dist/index.ts` therefore appears as only `dist`, while
vanilla Pi identifies it as `@narumitw/pi-statusline:dist`.

This is not a new presentation choice. It is a visible startup-parity defect in
the already specified owned Pi shell.

## What Changes

- The Pi engine boundary preserves the bounded source metadata attached to each
  loaded extension instead of exposing only its entry and resolved paths.
- The owned shell uses pinned Pi's compact extension-label rules: package
  extensions retain their npm or Git identity and entry suffix, while local
  extensions use the shortest unique trailing path and directory indexes omit
  `index.ts` or `index.js`.
- Hidden extensions, expanded paths, diagnostics, sorting, and resource loading
  remain unchanged.

## Capabilities

### Modified Capabilities

- `owned-pi-ui-foundation`: compact startup extension labels retain the same
  package identity and local-path disambiguation as pinned Pi.
