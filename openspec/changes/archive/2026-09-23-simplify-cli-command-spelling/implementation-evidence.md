## Implementation summary

- Added preferred word-based help/version forms and direct A1-profile package commands without adding a second execution path.
- Preserved existing help/version flags and supported `a1 pi` package spellings as compatibility aliases.
- Made complete help, generated usage, focused direct-command help, diagnostics, and README examples direct-only.

## Verification

- `npm run build` completed successfully and produced the public CLI artifacts.
- `npm run typecheck` completed successfully after the build for both source and bin configurations.
- Focused CLI dispatch, built-entry isolation, package transcript parity, and documentation tests passed, covering direct forms, compatibility aliases, malformed grammar, output streams/styles, and zero interactive launch.
- `npx openspec validate simplify-cli-command-spelling --strict` passed.
- Built `a1 help`, `a1 update --help`, and `a1 install --help` output was inspected and advertised only the supported direct grammar with no compatibility-alias section.

## Known gaps

None. No live network package installation was performed; isolated package-operation fixtures exercised the existing install/list/update/remove path and independent pinned transcript comparisons, while the public-entry fixture proved direct informational and focused-help forms avoid interactive and update side effects.
