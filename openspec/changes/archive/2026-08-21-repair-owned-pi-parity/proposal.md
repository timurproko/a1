## Why

User-controlled comparison found that bare A1 can show models backed by persisted A1 credentials while its `/login` selector labels the same providers unconfigured. That contradiction invalidates the claimed 1:1 owned-Pi acceptance and makes users unable to tell whether models come from an authenticated provider, stale state, or an empty profile.

## What Changes

- Restore pinned-Pi parity for provider authentication status, `/login`, `/logout`, available-model filtering, selected-model state, footer state, refresh, and restart.
- Treat each profile's authoritative provider-auth resolution as the source of truth: no credentials means no provider models, while valid persisted credentials remain logged in across launches and are visibly identified as configured.
- Preserve the intentional separation between bare A1's `~/.a1/agent` profile and vanilla `a1 pi`'s `~/.pi/agent` profile; parity evidence initializes equivalent states rather than assuming the two stores are shared.
- Ensure login and logout update credential status, available models, selected model, and visible status atomically enough that the UI never presents a contradictory state.
- Add independent untouched-Pi versus A1 coverage for empty, stored OAuth, stored API-key, environment/configured, expired-or-refreshable, logout, refresh-failure, stale-settings, and restart states without recording credential values.
- Keep A1-specific customization and all held multi-agent/composed-terminal work out of scope until this repair receives fresh user-controlled acceptance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Make provider authentication, model availability, selection, and visible login/logout state part of the independently verified 1:1 baseline.

## Impact

The change affects the public Pi model-runtime adapter, owned authentication selector data, model selector synchronization, active-model/footer reconciliation, profile-isolated test fixtures, independent terminal/workflow parity evidence, and manual acceptance. It does not merge profile stores, remove valid persisted credentials automatically, customize the Pi experience, or resume the held multi-agent change.
