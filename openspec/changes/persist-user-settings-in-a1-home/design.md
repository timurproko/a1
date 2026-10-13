# Design

## Context

See `proposal.md` for motivation. A1 currently has two intentionally separate settings backends: Pi's engine stores Agent-section values below the selected agent profile (`<home>/.a1/agent`), while `OwnedSettingsManager` stores A1-owned values below `resolveProductPaths().configDir`. The latter defaults to `%APPDATA%/a1` on Windows and an XDG configuration root on Unix. Composition and the pre-UI resident-tabs reader both assume that control-state root.

The platform config/data/runtime roots also own update caches, release state, endpoints, and other lifecycle data. Their defaults are public and explicitly required to remain unchanged, so relocating the entire product config root to `.a1` would be broader and riskier than relocating user preferences alone. Repository-local development additionally injects `A1_CONFIG_DIR` intentionally to keep test and checkout state isolated.

## Goals / Non-Goals

**Goals:**

- Give normal installed launches one effective-home-derived root for A1-owned preferences across package and release replacement.
- Keep one precedence rule across ordinary UI startup and pre-UI settings reads.
- Carry existing preferences forward without mutating or deleting the former document during startup.
- Preserve explicit configuration overrides as hermetic isolation boundaries.

**Non-Goals:**

- Relocate update caches, release metadata, runtime control state, prompt history, or databases.
- Merge A1-owned declarations into Pi's `settings.json` format or change Agent-setting persistence.
- Synchronize settings between machines, operating-system users, or distinct explicit overrides.
- Make old binaries that predate this contract understand later writes under `.a1`.

## Decisions

### 1. Add a dedicated owned-settings path contract

Launch-profile path resolution will expose the A1-owned settings roots separately from `ProductPaths`. Without an explicit `A1_CONFIG_DIR`, the primary config root for `OwnedSettingsManager` will be the existing `managedStateRoot` (`<effective-home>/.a1`), producing `<effective-home>/.a1/settings/<profile-id>.json`. Pi continues to receive `<effective-home>/.a1/agent`.

When `A1_CONFIG_DIR` is explicitly present, its normalized value remains the sole owned-settings root and no home or compatibility fallback is consulted. This preserves repository-local launches, test fixtures, portable/custom deployments, and the public meaning of the override.

Changing `resolveProductPaths().configDir` itself was rejected because it would also relocate update-check caches, release-note state, resident host routing state, and other control data. Storing A1 declarations in `.a1/agent/settings.json` was rejected because the A1 and Pi schemas, migrations, ownership boundaries, and downgrade behavior are deliberately independent.

### 2. Use missing-only compatibility fallback with primary precedence

For an unoverridden launch, the former platform config root is retained as one compatibility source. Reads follow this order:

1. Read the `.a1` profile document when it exists.
2. Only when that path is absent, read the former platform-config profile document.
3. When both are absent, resolve declared defaults.

An existing but unreadable, malformed, oversized, unsupported, or migration-failing primary document follows the current fail-safe/default behavior and does not fall through to stale legacy values. This distinguishes "not migrated yet" from "the user has a primary document that needs attention."

Merging the two documents was rejected because conflicts would have no trustworthy per-key chronology. Falling back after any primary error was rejected because it could silently revive values the user had replaced or intentionally removed.

### 3. Migrate lazily through the existing atomic write path

Reading a former document performs no filesystem mutation. The settings resolution retains its accepted values and unknown keys. On the next accepted A1-owned change, the existing document serialization and temporary-sibling rename write that complete resolved state to the primary `.a1` path. The former document remains untouched for audit and rollback safety.

An eager startup move was rejected because reads are currently side-effect free, startup may be read-only, and a failed move could make an older installation lose its only known document. Writing both locations was rejected because dual authorities would drift and would keep the former platform path permanently authoritative.

### 4. Share root selection across UI and pre-UI consumers

Composition will construct `OwnedSettingsManager` with the resolved primary and optional compatibility root rather than calling `resolveProductPaths().configDir` directly. The resident-tabs bootstrap reader will receive the same roots and apply the same missing-only precedence before deciding whether resident routing is enabled. Other consumers of `ProductPaths.configDir`, including update caches and release-note acknowledgement, remain unchanged.

Root selection will be centralized; document parsing can remain within the existing settings modules. Focused tests will assert identical primary/fallback/override choices at both consumption points so future startup optimization cannot reintroduce split behavior.

### 5. Prove persistence independently of release identity

Tests will construct different package/release identities under one effective home and verify that both resolve the same owned-settings file and selected values. Coverage will also exercise primary-over-fallback precedence, fallback-to-primary lazy write with unknown-key preservation, absent-file defaults, explicit-override isolation, and resident preflight reads. Existing Pi integration coverage remains the authority for engine writes to `.a1/agent/settings.json`; a focused boundary assertion will ensure the new A1 write does not alter that file.

A UI snapshot test alone was rejected because it could pass while each release still reads a different storage path.

## Risks / Trade-offs

- **[An older binary launched after migration still reads the former document]** → Keep that document intact; the compatibility guarantee applies to binaries implementing this contract, and no unsafe reverse synchronization is attempted.
- **[Two documents contain different values]** → The `.a1` primary wins as a whole document; no ambiguous per-key merge occurs.
- **[A malformed primary hides a valid former document]** → Preserve and report the primary through existing unreadable-settings behavior instead of silently resurrecting stale preferences.
- **[Pre-UI and UI readers drift]** → Centralize root selection and cover both consumers with the same precedence fixtures.
- **[Development runs unexpectedly modify real user preferences]** → Keep the launcher's explicit `A1_CONFIG_DIR` authoritative and disable home fallback whenever it is present.

## Migration Plan

1. Ship root resolution and compatibility reads before any writer targets `.a1`.
2. On first launch, use an existing `.a1` document, otherwise read the former platform document, otherwise use defaults.
3. On the user's next accepted A1-owned change, atomically write the complete resolved document to `.a1`; do not delete or rewrite the former source.
4. Subsequent launches use `.a1` exclusively because the primary now exists.

Rollback requires no destructive migration reversal: the former document remains available to old versions, though it intentionally does not receive changes made after the new primary was created.
