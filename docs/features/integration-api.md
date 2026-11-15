# Public integration API

Invoke `a1 api <request-json>` using a literal argument array. JSON alone selects the operation; this is A1 protocol 1, not Pi RPC. No child agent, HTTP listener, daemon, subscription or prompt-control operation is created.

Request example: `{"version":1,"id":"read-1","type":"settings.get","setting":"accentColor","target":{"scope":"session","sessionId":"SESSION-UUID","runtimeId":"RUNTIME-UUID"}}`.

Response envelope: `{"version":1,"id":"read-1","type":"response","command":"settings.get","success":true,"data":{...}}`. Failure replaces data with `error: {code,message}` and sets success false. Exit zero means success; nonzero means failure. Ordinary calls emit exactly one LF-terminated JSON record (maximum 8192 UTF-8 bytes), without progress output. Requests are one JSON argument of at most 4096 UTF-8 bytes; IDs match `[a-zA-Z0-9._:-]{1,64}`. Unknown fields are rejected. Only LF frames records; Unicode separators inside strings are not record delimiters.

## Operations

- `capabilities`: installed supported operations, `launchColor`, `terminalIdentity` and bounded snapshots. No target, interactive startup, trust prompt, endpoint or Core probe.
- `settings.list`: `data.settings` contains descriptors for the two supported settings. Choices, labels, descriptions and section derive from A1 declarations; no target required.
- `settings.get`: requires setting and target; returns target, setting, storedValue, effectiveValue, origin and application.
- `settings.update`: additionally requires value; returns the same readback plus status `applied` (session) or `stored` (profile).
- `session.get`: requires a session target; returns its exact target only after the active runtime validates the binding.

Targets are either `{scope:"profile",profileId:"a1"}` or `{scope:"session",sessionId,runtimeId}`. Both live identities must be complete UUIDs. There is no ambient or machine-wide current-session selection, terminal inventory, private-path access or comparison-profile control.

## Supported settings

| Setting | Scope | Boundary |
| --- | --- | --- |
| `defaultAccentColor` | profile | `next-session`: durable default for future initialization |
| `accentColor` | session | `live`: ephemeral Current color of the exact runtime/session |

Palette choices come from descriptors, not an extra color endpoint. Session storedValue means the session-local selection, not disk persistence. Session origin is `session`; profile origin is `default` or `stored`. A profile's effectiveValue describes its future-session initialization policy, not a claim about any already-running session. An invocation `--session-color` wins on startup and successful replacement, never persists, and is not changed by live updates.

Profile updates are atomic per-key assignments under the existing shared settings lock, preserving unrelated concurrent changes and unknown fields. Same-key assignments are last-writer-wins; this API exposes no document read-modify-write operation and needs no revision token. Running peers retain Current color and refresh persistent values through the existing shared-file path. Engine settings are not exposed; the TUI continues through the existing AgentSettingsPort/PiSettingsCoordinator for engine effects and durability.

## Errors and completion

Stable request errors: `invalid-request`, `unsupported-version`, `unsupported-operation`, `target-required`, `invalid-target`, `unsupported-profile`, `unsupported-scope`, `unsupported-setting`, `invalid-value`. Runtime/transport failures include `session-unavailable`, `ambiguous-session`, `request-expired`, `control-boundary`, `control-limit`, `control-failed`, `settings-failed`, `invalid-response`, `response-limit`. Error messages are diagnostics, not machine contracts.

An update is acknowledged only after its owning service applies or durably stores it. Requests retain nonce, process liveness, exact runtime/session, binding-generation, serialization and deadline fencing in private local IPC. Expired/disconnected queued work cannot replay onto a replacement. Lost acknowledgement is an unknown outcome: read back a fresh exact target instead of automatic retry/replay. Client JSON parsing alone is insufficient: validate version, ID, response type, command, target, setting, value and completion status. Structured failures must remain available to callers.

## Coordinated Herdr rollout

The canonical consumer is external, under `C:/Users/tprokopiev/.config/herdr-app/customizations/`, tracked by yadm rather than this PR. Its source is preserved in `timurproko/MyConfigs` branch `refactor/shared-a1-api`, commit `6cec0e8e`, draft PR #1. This A1 PR does not include those external source files. It must use this candidate protocol for live matching; old dedicated color routes and legacy `custom.a1.*` discovery are retired. Native labels are hints, not authority: the runtime still validates the exact binding. Startup transformation targets the coordinated current installation without a capability probe, and retains conservative argv matching and explicit user overrides.

Build/test both sides against disposable fixtures. Do not deploy the breaking consumer until target A1 installations support this contract. Old running sessions remain usable but unavailable for new control; never restart them, inject input, or repair labels automatically. Publication and deployment require separate authorization. Source and customization build are prepared, not deployed. Any separately installed legacy companion reference must be removed by its owner before a future deployment removes its old generated worker. Relative explicit executable paths are deliberately unsupported for external control because a worker cannot assume the launch cwd; absolute configured installations never fall back to PATH.
