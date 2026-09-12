## Why

Internal names should describe their responsibilities rather than repeat the product brand, while users must retain the `a1` command, A1-facing configuration, and their existing `.a1` state. The current identifier checker misses several name forms and exempts arbitrary `A1_*` properties, while private environment keys share a brand-enforcing registry with public settings and cross old/new release boundaries during activation and rollback; a mechanical rename would therefore be unsafe.

## What Changes

- Enforce brand-neutral internal constants, variables, parameters, functions, methods, classes, types, and members, including private and quoted member names and case-insensitive `a1` occurrences. Refactor violations identified by the strengthened inventory without renaming external contracts.
- Separate public product identity from private runtime, test, and automation environment contracts. Inventory each key's producers, consumers, exposure, canonical spelling, and compatibility requirements rather than treating every `A1_*` key as public.
- Preserve the public command and display name, npm package identity, supported user-facing environment settings, existing user-directory resolution, persisted schemas, and externally consumed protocol fields. Public spellings remain data behind neutral code names.
- Rename confirmed private environment keys to descriptive, brand-neutral spellings, updating their complete producer/consumer chains. Preserve unresolved caller-facing or integration-facing spellings until their exposure has been established; lack of documentation alone is not proof of privacy.
- Introduce narrowly scoped compatibility handling for old updaters, new releases, retained older releases, rollback, and recovery. Legacy private spellings may remain only as classified compatibility data while supported cross-version callers or targets require them; arbitrary property names do not gain an exception.
- Add a fail-closed, syntax-aware PR check over the complete contents of added, modified, copied, and renamed-to policy inputs, using the exact PR merge base and head. Retain a full tracked-source audit and require it when policy or classification inputs change.
- Add regression and cross-version acceptance requirements covering public settings and paths, naming-check bypasses, environment conflicts, installed launch, ongoing sessions, update activation, rollback, and interrupted-update recovery.

No user-facing breaking change is intended. Renaming a supported external setting, moving user state, changing stored formats, or dropping support for older release contracts is outside this change.

## Capabilities

### New Capabilities

None. This change strengthens existing identity, validation, and update capabilities.

### Modified Capabilities

- `product-identity`: Distinguish public identity values from private environment contracts, require brand-neutral internal names, and narrowly classify permitted external and compatibility spellings.
- `continuous-integration`: Require auditable changed-file naming/environment governance, syntax coverage, conservative full-scan escalation, and current-head required-check integration.
- `cli-self-update`: Preserve cross-version launch-environment compatibility through activation, retained-release launch, rollback, and recovery without disrupting existing sessions or weakening release verification.

## Impact

- Identity and environment ownership: `src/product-identity.ts`, `src/product-identity.json`, launch/path resolution, startup tracing, supervision, release bootstrap/warmup/cleanup/recovery, and `bin/` entry points.
- Additional environment producers and consumers: native terminal-host code, development/release scripts, test workers, and CI workflows. Existing third-party APIs and immutable vendor sources are not renamed.
- Governance: `scripts/governance/product-identifier-policy.mjs`, its declarations and inventory tests, validation-impact selection, architecture/full-validation integration, the required aggregate check, and affected governance baselines.
- Compatibility: public settings and serialized identities remain stable; private cross-release keys require a controlled transition rather than a simultaneous cutover assumption. Real legacy-contract fixtures are needed, not merely current-code fixtures stamped with older versions.
- No new runtime dependency is required by the proposal. Parsing and repository scanning remain development/CI responsibilities and must not enter the interactive startup graph.
- This delivery contains only OpenSpec planning artifacts. Implementation, tests, workflow edits, and baseline regeneration belong to a subsequent implementation change after specification integration.
