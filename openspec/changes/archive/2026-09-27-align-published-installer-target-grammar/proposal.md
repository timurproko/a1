## Why

Development publication run [36342374957](https://github.com/timurproko/a1/actions/runs/36342374957) OIDC-published and registry-verified both `0.2.1-dev.604` packages, then failed every Windows, Linux, and macOS published-pair lane. The smoke harness still invoked the installer with removed `--version <exact-version>` syntax, so the newly published installer correctly rejected the harness before installation.

## What Changes

- Make develop published-pair smoke invoke `--develop <exact-preview-version>` and retain bare invocation for a release.
- Add focused repository-policy coverage that rejects regression to removed installer target options in the smoke harness.
- Preserve immutable `.604` bytes and require a newly numbered development publication to pass every native published-pair lane, completion, and aggregate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Published-pair smoke uses the installer interface accepted by the package version it validates.

## Impact

- Changes `scripts/release/smoke-published-installer.mjs` and focused release-policy coverage.
- Does not alter package contents already published as `.604`, OIDC identity, registry tags, release matrices, stable mutation guards, or installer production behavior.
- `.604` remains valid immutable registry evidence for publication and registry verification, but its failed native installation lanes and aggregate remain failed.
