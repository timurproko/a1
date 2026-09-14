## Why

Internal names should describe their responsibilities rather than repeat the product brand, while users retain the `a1` command, public configuration, and `.a1` user data. The maintainer is currently the only user and has explicitly chosen a clean private-contract cutover, so carrying legacy aliases and migration machinery would add complexity without a required compatibility benefit.

## What Changes

- Enforce brand-neutral internal constants, variables, parameters, functions, methods, classes, types, and members, including private and quoted member names and case-insensitive `a1` occurrences. Refactor violations found by the strengthened inventory.
- Separate public product identity from private runtime, test, and automation environment contracts. Inventory each key's producers, consumers, exposure, and one supported spelling rather than treating every `A1_*` property as public.
- Preserve the command and display name, npm package identity, supported public environment settings, user-directory resolution, user-data formats, and declared external protocol spellings. Public values remain data behind neutral code names.
- **BREAKING:** Replace confirmed private environment keys in one cutover. Private consumers and producers support only the new neutral contract: no legacy aliases, dual reads/writes, target-version negotiation, compatibility adapters, or migration helpers.
- **BREAKING:** Pre-cutover updaters, retained runtimes, rollback targets, and recovery capsules are not supported by the new private contract. The first installation requires stopping existing processes and reinstalling through npm rather than relying on the old `a1 update` path. Any necessary reset is a separately confirmed, narrowly scoped reset of disposable runtime/release state, never automatic deletion of settings, sessions, history, or `.a1` user data.
- Keep a fail-closed, syntax-aware PR check over the complete contents of added, modified, copied, and renamed-to policy inputs using the exact PR merge base and head. Retain full tracked-source auditing and require it when policy or classification inputs change.
- Keep checker regression tests and runtime acceptance for public settings, neutral-only launch, update, retained-session continuity, rollback, and recovery between releases using the new contract. Replace old/new interoperability tests with tests proving obsolete private inputs and unsupported targets cannot activate a runtime.

This is an intentional internal runtime compatibility break, not a product rename or user-data migration. Unresolved caller-facing settings retain their exact spelling pending exposure review; that protection does not permit aliases for confirmed private keys.

## Capabilities

### New Capabilities

None. The existing identity, validation, and update capabilities receive revised requirements.

### Modified Capabilities

- `product-identity`: Distinguish supported external values from neutral-only private environment contracts and forbid legacy private-key exceptions.
- `continuous-integration`: Require auditable changed-file naming/environment governance, regression tests, conservative full-scan escalation, and current-head required-check integration.
- `cli-self-update`: Define the one-time clean cutover and constrain subsequent activation, retained launch, rollback, and recovery to the single supported private contract while preserving user data and release verification.

## Impact

- Identity/environment ownership: `src/product-identity.ts`, `src/product-identity.json`, launch/path resolution, startup, supervision, release lifecycle code, and `bin/` entry points.
- Other private-key producers and consumers: native code, development/release scripts, test workers, and workflows. Established public and third-party interfaces are not renamed merely because they are visible in code.
- Governance: the identifier inspector and its regression tests, environment classification, validation-impact selection, architecture/full-validation integration, required aggregate results, and affected baselines.
- Cutover: one coordinated installation and, only if needed, a documented disposable-state reset. No old-contract execution support is retained, and no historical runtime or recovery payload is rewritten.
- No new runtime dependency is required. Parsing and repository scans remain CI/development responsibilities and must not enter interactive startup.
- This delivery revises OpenSpec planning artifacts only. No implementation, executable tests, workflows, baseline generation, installation, or state reset is performed here.
