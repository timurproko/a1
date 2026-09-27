## Why

Development run [36335398692](https://github.com/timurproko/a1/actions/runs/36335398692) successfully OIDC-published and registry-verified both `0.2.1-dev.602` packages. Linux and Windows then installed and launched the exact published pair, but the macOS published-pair lane failed with `installation failed: launcher verification failed`, so release completion and the aggregate correctly failed.

The installer resolves the npm launcher symlink to its canonical target but compares it with a merely lexical expected entry path. On macOS, the isolated prefix is created beneath `/var`, whose canonical path is beneath `/private/var`; the two paths identify the same file but compare unequal. The installer therefore rejects npm's valid launcher before activation.

## What Changes

- Compare a Unix npm launcher and its expected application entry by canonical filesystem identity, preserving exact ownership checks.
- Add a deterministic regression in which a lexical prefix alias and its canonical target identify the same installed entry, while a genuinely foreign target remains rejected.
- Preserve `.602` as immutable publication and partial native-smoke evidence, and require a newly numbered development candidate to pass publication, all native published-pair lanes, completion, and the aggregate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `silent-installer`: Launcher ownership verification accepts lexical path aliases only when both paths canonically resolve to the same installed application entry.

## Impact

- Changes `packages/a1-install/bin/a1-install.js` and focused installer tests.
- Does not weaken package identity, version, launcher completeness, command precedence, activation, OIDC, registry-byte, matrix, or stable-release checks.
- `@timurproko/a1@0.2.1-dev.602` and `@timurproko/a1-install@0.2.1-dev.602` remain immutable OIDC-published packages under `next`; the failed run remains incomplete release evidence.
