## Why

A directly launched Windows installation can use a user-scoped npm global prefix while Node supplies the active npm implementation from its own installation directory. In that supported layout `npm_execpath` is absent, `npm root --global` identifies the user prefix, and the current recovery-capsule resolver looks only beneath that global root. A1 therefore rejects a valid update immediately before protected package replacement even though the active npm JavaScript entry exists beside the active npm launcher. The transaction rolls back safely, but the user cannot update without manually injecting npm's private lifecycle environment variable.

## What Changes

- Resolve the active npm JavaScript entry without requiring `npm_execpath` by adding a validated fallback from the npm command/current Node installation to Node's bundled `node_modules/npm/bin/npm-cli.js` layout.
- Preserve the existing `npm_execpath` and active-global-root candidates and require every selected entry to canonicalize to a regular file before it is recorded in recovery authority.
- Keep package destination, complete launcher set, exact target, explicit prefix arguments, recovery capsule, and rollback behavior bound to the already confirmed installation prefix.
- Add deterministic Windows regression coverage for a user-scoped global package root and a separate Node-bundled npm implementation, plus fail-closed coverage when no candidate exists.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: Permit cancellation-safe replacement when A1 is launched directly and active npm is bundled with Node outside npm's configured global package prefix.

## Impact

The change affects npm JavaScript-entry discovery for protected self-update replacement and its focused recovery tests. It does not change update commands, channels, package identity, npm registry/configuration behavior, selected installation ownership, replacement arguments, recovery schema, launcher restoration, activation, or user data. No dependency or migration is introduced.
