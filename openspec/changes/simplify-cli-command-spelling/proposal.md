## Why

A1's everyday informational and package commands require punctuation or an extra `pi` namespace that users should not need to remember. The shortest readable forms should be the preferred public interface while existing scripts continue to work.

## What Changes

- Add `a1 help` and `a1 version` as preferred equivalents of the existing help and version flags.
- Add direct `a1 install <source>`, `a1 remove <source>`, `a1 uninstall <source>`, and `a1 list` package commands for A1's own profile.
- Extend direct `a1 update` with `--extensions` and `<source>` package-update forms alongside its existing stable, development, and model-update forms.
- Keep `--help`, `-h`, `--version`, `-v`, and the supported `a1 pi ...` package forms as compatibility aliases with the same outcomes and safety boundaries.
- Make help, focused syntax guidance, and README examples lead with the direct forms without advertising unsupported project-local operations or independent Pi updates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `a1-shell`: Accept and advertise word-based help/version commands and direct package-management grammar while preserving compatibility aliases and quiet unsupported commands.
- `extension-packages`: Make direct A1 package commands the preferred namespace, define alias equivalence, and preserve A1-profile isolation and pinned transcript behavior.

## Impact

The CLI parser, usage/help and package-message rendering, README command examples, and focused CLI/documentation tests will change. Package operation implementations, profile ownership, update transactions, the pinned Pi runtime, and external dependencies remain unchanged.
