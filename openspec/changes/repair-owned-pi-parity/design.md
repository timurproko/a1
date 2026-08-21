## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for behavior. The observed A1 profile contained persisted OpenAI Codex and Kimi OAuth records, so exposing those providers' models was consistent with the model runtime. The parity defect is that A1 discarded provider-auth status while adapting login choices: its model runtime recognized configured providers, but the reconstructed public authentication selector received no status and rendered them as unconfigured.

Pinned Pi builds login options from each provider's authoritative auth status, preserves auth type/source metadata for rendering, and obtains available models from the same model runtime. A1 currently reduces login options to generic id/label/description values and later recreates provider options without the status needed by the selector. The repair must preserve A1's public-adapter boundaries and profile isolation without reading or exporting credential values.

## Goals / Non-Goals

**Goals:**

- Give login/logout surfaces and model selection one authoritative provider-state interpretation.
- Match pinned Pi for empty, stored, non-stored, logout, stale-setting, refresh-failure, and restart states.
- Preserve separate A1 and vanilla profile stores while making parity fixtures equivalent.
- Turn the reported screenshots into focused regression and independent parity coverage without storing secrets.
- Obtain fresh user-controlled acceptance before customization begins.

**Non-Goals:**

- Sharing or migrating credentials between `~/.a1/agent` and `~/.pi/agent`.
- Automatically deleting valid persisted credentials because a user has started a new process.
- Redesigning login, model selection, footer, or provider terminology.
- Adding custom Pi experience, structured tabs, multi-agent behavior, or composed terminals.
- Changing upstream Pi or relying on private/deep Pi imports.

## Decisions

### 1. Preserve provider status in a dedicated A1-owned auth option

The engine adapter will expose a typed, dependency-free authentication provider option carrying provider identity, display name, auth method, and optional configured status with source. The component adapter will map that record once into the documented public authentication-selector shape.

Reusing the generic workflow option was rejected because it cannot represent configured status and caused the current contradiction. Passing vendor-specific provider objects through the shell was rejected because it would weaken the Pi boundary.

### 2. Use the model runtime's auth resolution as authority

Provider labels will be derived from the same public model-runtime status used to compute available models, including stored, runtime, environment, and provider-config sources. Stored credential listing remains authoritative only for `/logout`, because logout owns stored records but must not claim to remove ambient configuration.

Reading `auth.json` directly in production was rejected: it would duplicate credential semantics, mishandle refresh/config sources, and expose sensitive storage details. Settings or cached all-model catalogs are not authentication authorities.

### 3. Reconcile model-facing state after every auth transition

Successful login and logout will update available-provider/model snapshots before rebuilding selector, active-model, warning, and footer state. If the previous selected model is no longer available, A1 will follow pinned Pi's fallback/no-model behavior rather than retaining a stale selection. Failed or timed-out refresh will remain bounded and will not expand availability.

A forced restart after login/logout was rejected because pinned Pi updates the active session. Clearing every catalog on transient refresh failure was rejected because it can discard still-authoritative state and diverge from pinned behavior.

### 4. Test state matrices in isolated equivalent profiles

Focused tests will construct isolated A1 profile roots and synthetic public model runtimes for deterministic state transitions. Independent terminal/workflow parity will launch untouched pinned Pi and A1 with equivalent temporary profile fixtures and identical settings/actions. Fixtures may identify provider ids and credential types but will use inert synthetic values; evidence will include no tokens, API keys, refresh values, or copied user auth files.

Comparing the user's populated A1 profile with an empty vanilla profile was rejected as a parity oracle because the initial states differ. The screenshots remain the originating user finding and acceptance reference.

### 5. Keep the repair narrower than customization

The vanilla presentation and workflow remain unchanged except where required to restore pinned behavior. The held multi-agent change stays on hold regardless of this repair's outcome. Customization begins only in a separately approved change after fresh parity acceptance.

## Risks / Trade-offs

- **[Public model-runtime auth status changes across Pi versions]** → Keep mapping inside the Pi engine adapter and extend upgrade-conformance fixtures.
- **[OAuth expiry and refresh make tests nondeterministic]** → Use synthetic clocks/statuses for focused tests and bounded isolated real-runtime cases without live credentials.
- **[A logout can leave ambient configuration active]** → Distinguish stored credential removal from environment/runtime/provider-config authority and match pinned messaging.
- **[Refreshing model state can race selector rendering]** → Serialize the auth terminal outcome and state reconciliation, then render one resulting snapshot.
- **[Tests could leak credentials]** → Use temporary synthetic stores and explicitly reject secret-bearing evidence fields.

## Migration Plan

1. Add the A1-owned auth-provider option and focused adapter/component contract tests.
2. Preserve authoritative configured status through login selector composition and verify the reported stored-credential case.
3. Reconcile login/logout, available models, active selection, warnings, and footer state across the complete state matrix.
4. Run independent equivalent-profile pinned-Pi versus A1 parity and fresh user-controlled comparison.
5. Integrate only after focused, containing, architecture, release, and strict OpenSpec gates pass.

Rollback reverts the adapter mapping and synchronization changes as one unit. It does not modify or migrate user credential files; `a1 pi` remains the untouched recovery oracle throughout.
