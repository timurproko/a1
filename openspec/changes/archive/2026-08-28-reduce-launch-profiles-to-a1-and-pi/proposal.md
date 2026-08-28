## Why

A1 needs one product launch and one Pi comparison instrument. The third isolated-profile launch duplicates the same runtime, adds profile, trust, lifecycle, documentation, and test policy, and suggests a security property it does not provide.

## What Changes

- Reduce interactive profile identity to `a1` and `pi`.
- Remove the third command and repository development script rather than retaining aliases, compatibility routing, dedicated diagnostics, or reserved grammar.
- Remove its profile path, initialization, trust-argument plumbing, identity metadata, lifecycle values, tests, and current documentation.
- Migrate persisted launch-instance storage to retain only supported profile rows.
- Keep historical archives unchanged; they are not current product inputs.

**BREAKING**: prerelease installations lose the third interactive launch form and its profile data is removed during the approved local cutover.

## Capabilities

### Modified Capabilities

- `launch-profiles`: A1 supports only its product profile and the prerelease Pi comparison.
- `product-identity`: current state metadata declares only the two retained Pi roots.
- `owned-ui-settings`: current profile isolation no longer names a third settings scope.
