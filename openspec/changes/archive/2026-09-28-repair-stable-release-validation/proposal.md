## Why

Stable publication run [36388284997](https://github.com/timurproko/a1/actions/runs/36388284997) packed `0.2.1` from current `develop` but failed complete validation on every native lane before publication. The failures expose three independent validation regressions: root README policy still demands operator prose intentionally removed by #607/#608, macOS trust tests compare lexical `/var` paths with canonical `/private/var` identities, and one Windows Node 22 runtime fixture cleanup hit a transient `EBUSY` after its assertions completed.

## What Changes

- Keep the root README concise and move detailed release-safety enforcement exclusively to the release runbook and command help.
- Add lightweight documentation-path validation so future README/runbook edits are checked before documentation auto-merge instead of first failing a release.
- Make project-trust tests assert the canonical filesystem identity already required by production behavior on macOS.
- Preserve and verify the independently merged bounded native runtime-fixture removal retry without retrying tests or weakening assertions.
- Preserve the failed run as evidence and require a fresh `0.2.1` stable publication attempt to pass all native validation and publication gates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Release documentation checks respect the root README's concise audience, run on relevant documentation changes, and native fixture validation handles canonical paths and bounded post-test filesystem release.

## Impact

- Changes release-documentation governance and focused repository tests, not the concise root README.
- Changes only test expectations/cleanup around already-canonical project trust and runtime disposal; no trust decision, persistence, session, or product cleanup behavior changes.
- Does not publish, tag, or mutate `0.2.1` during implementation. The failed run created no npm version, release tag, GitHub Release, or `latest` movement.
- PR #597 was a separate generated repair for an older run. It merged independently as `af4db315` during implementation and now supplies the bounded Windows fixture-removal retry; this change preserves that exact fix rather than duplicating or repurposing it.
