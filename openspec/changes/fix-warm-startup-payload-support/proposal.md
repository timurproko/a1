## Why

A compatible approved A1 release can reject invocation color or literal prompt startup after restart certification is created. Bootstrap currently mistakes the compact restart projection's minimal executable entries for a complete feature inventory, so a successful cold launch can become an unsupported warm launch without any release change.

## What Changes

- Resolve startup-payload compatibility from authenticated complete evidence for the exact selected release when compact restart evidence cannot establish support. Reuse existing manifest loading and identity/dependency checks rather than filesystem existence or installed-version claims.
- Preserve restart seal version 1 and its minimal `bin/ui.js` entry contract, including existing certifications. Add no capability-resolution reads to ordinary launches without invocation payloads.
- Add release-owner regression coverage using real materialization/certification and the compact restart shape for color and literal prompts, including repeated warm launches.
- Retain fail-closed unsupported/unverifiable release handling before UI spawn, and exercise selection, update fallback, and reselection without borrowing another release's capabilities.
- Preserve the public version-1 discovery response, first-frame invocation color, Default/Current isolation, live control, terminal identity reporting, and comparison behavior. Clarify maintained diagnostics/documentation only if needed by the repair.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `launch-profiles`: require startup-payload compatibility to use complete authenticated evidence bound to the selected release, independent of full versus compact restart projection; preserve no-payload behavior and literal propagation.

## Impact

- Production owner: `src/foundation/release`, principally `bootstrap.ts`, reusing `readCertifiedReleaseManifest` in `release-store.ts`. Restart certification contracts are inspected and covered but do not require a schema migration.
- Tests: owner-mirrored release startup/certification and selection fixtures; existing first-frame, trust, settings, live API, and comparison tests provide focused preservation checks.
- No new dependencies, Herdr/Core/native/renderer changes, installed release edits, certification rewrites as a workaround, direct retained UI launching, retries without the payload, or control of existing agents.
- This PR is planning-only. Implementation requires explicit approval and an implementation request in this same stream. Trusted automation owns readiness/finalization; integration requires a separate exact-candidate maintainer decision.
