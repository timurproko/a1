# Public integration API

Invoke `a1 api <request-json>` using a literal argument array. JSON alone selects the operation; this is A1 protocol 1, not Pi RPC. No child agent, HTTP listener, daemon, subscription or prompt-control operation is created.

Request example: `{"version":1,"id":"read-1","type":"settings.get","setting":"accentColor","target":{"scope":"session","sessionId":"SESSION-UUID","runtimeId":"RUNTIME-UUID"}}`.

Response envelope: `{"version":1,"id":"read-1","type":"response","command":"settings.get","success":true,"data":{...}}`. Failure replaces data with `error: {code,message}` and sets success false. Exit zero means success; nonzero means failure. Ordinary calls emit exactly one LF-terminated JSON record (maximum 8192 UTF-8 bytes), without progress output. Requests are one JSON argument of at most 4096 UTF-8 bytes; IDs match `[a-zA-Z0-9._:-]{1,64}`. Unknown fields are rejected. Only LF frames records; Unicode separators inside strings are not record delimiters.

## Operations

- `capabilities`: installed supported operations, `launchColor`, `terminalIdentity`, bounded snapshots and `lifecycle` (both lifecycle operations below are implemented). No target, interactive startup, trust prompt, endpoint or Core probe.
- `settings.list`: `data.settings` contains descriptors for the two supported settings. Choices, labels, descriptions and section derive from A1 declarations; no target required.
- `settings.get`: requires setting and target; returns target, setting, storedValue, effectiveValue, origin and application.
- `settings.update`: additionally requires value; returns the same readback plus status `applied` (session) or `stored` (profile).
- `session.get`: requires a session target; returns `{target,name,nameRevision}` only after the active runtime validates the binding. Name is the authoritative durable name or null; the revision is opaque.
- `session.rename`: requires a session target, `name` and `expectedNameRevision` from `session.get`; returns `{target,name,nameRevision,status:"applied"}` after the ordinary manual naming owner applies it.
- `session.lifecycle`: requires a session target; returns a read-only exit-readiness snapshot of that exact live session (below). It clears, dismisses and interrupts nothing.
- `session.exit`: requires a session target; stops that exact session through the same path as `/quit`, but only when its readiness has no blocker at the moment the runtime handles the request. Admitted at most once per session; there is no force option.

Targets are either `{scope:"profile",profileId:"a1"}` or `{scope:"session",sessionId,runtimeId}`. Both live identities must be complete UUIDs. There is no ambient or machine-wide current-session selection, terminal inventory, private-path access or comparison-profile control.

## Sidebar / external manual renaming

Read `session.get`, then submit `session.rename` with its `nameRevision` as `expectedNameRevision`. A name is trimmed, nonempty, single-line, at most 256 Unicode code points and within the request byte limit; controls and Unicode line/paragraph separators are rejected. A stale revision fails with `name-conflict`, never overwriting a newer local or external edit. A current same-name request is a no-op, without duplicate history. Manual edits persist through the same engine owner as `/name` and automatic naming preserves them. In-memory/nonpersistent sessions cannot provide durable name control and return `session-unavailable`.

Existing A1-to-Herdr program-status/name reporting remains unchanged. API renames use ordinary name-change notifications; they do not add polling, title overrides or another display database. Herdr plugin feature switches gate only plugin actions, not vanilla native reporting. A missing reply means unknown completion: read again; do not replay a rename automatically.

Request example: `{"version":1,"id":"rename-1","type":"session.rename","target":{"scope":"session","sessionId":"SESSION-UUID","runtimeId":"RUNTIME-UUID"},"name":"Fix cache","expectedNameRevision":"64-LOWERCASE-HEX-CHARACTERS-FROM-SESSION-GET"}`.

## Graceful exit for supervisors

An external supervisor (for example Firstmate through Herdr Core) retires a finished A1 worker in three steps: read the exact target from the native `a1.session` and `a1.runtime` Core labels, request `session.exit` with a literal argument array, then verify the terminal's program exit through Core before archiving, replacing or tearing anything down. Typing `/quit`, Ctrl+D or Core's escalating kill are not substitutes: they cannot prove the editor was empty or that nothing was queued.

`session.lifecycle` data: `{target, lifecycle, editorEmpty, pendingSubmissions, queuedInput, overlayOpen, exitAdmissible, blockers}`. `lifecycle` is one of `starting`, `ready`, `busy`, `suspended`, `stopping`, `stopped`, `failed`. `blockers` is ordered and drawn from:

| Blocker | Meaning |
| --- | --- |
| `session-stopping` | shutdown already admitted or the session is stopping, stopped or failed |
| `session-busy` | lifecycle is not `ready` (a turn runs, startup is incomplete, or the shell is suspended) |
| `editor-not-empty` | the editor holds text; whitespace-only drafts count |
| `pending-input` | a submission is waiting, engine input is queued, or the queue size cannot be read |
| `overlay-open` | a dialog, selector or overlay is open |

`exitAdmissible` is true exactly when `blockers` is empty. The snapshot is advisory: the runtime re-evaluates readiness inside its serialized request handler with no asynchronous gap before admitting, so a turn that starts between the two calls is still refused.

`session.exit` success data: `{target, status: "admitted", lifecycle: "stopping"}`. Failure uses the first blocker as `error.code`. Admission means shutdown has started in that exact runtime; the acknowledgement is written before teardown proceeds, and later requests answer `session-stopping`. It does **not** mean the process has exited, the terminal is free or a worktree is released: verify those through your own host facts. A timeout or closed connection is an unknown outcome; read `session.lifecycle` (or Core) instead of retrying blindly, and never apply an expired request to a replacement session. Concurrent exit requests admit exactly one. A failed engine quit leaves the shell usable and clears the admission so a later request may try again.

Request example: `{"version":1,"id":"retire-7","type":"session.exit","target":{"scope":"session","sessionId":"SESSION-UUID","runtimeId":"RUNTIME-UUID"}}`.

## Supported settings

| Setting | Scope | Boundary |
| --- | --- | --- |
| `defaultAccentColor` | profile | `next-session`: durable default for future initialization |
| `accentColor` | session | `live`: ephemeral Current color of the exact runtime/session |

Palette choices come from descriptors, not an extra color endpoint. Session storedValue means the session-local selection, not disk persistence. Session origin is `session`; profile origin is `default` or `stored`. A profile's effectiveValue describes its future-session initialization policy, not a claim about any already-running session. An invocation `--session-color` wins on startup and successful replacement, never persists, and is not changed by live updates.

Profile updates are atomic per-key assignments under the existing shared settings lock, preserving unrelated concurrent changes and unknown fields. Same-key assignments are last-writer-wins; this API exposes no document read-modify-write operation and needs no revision token. Running peers retain Current color and refresh persistent values through the existing shared-file path. Engine settings are not exposed; the TUI continues through the existing AgentSettingsPort/PiSettingsCoordinator for engine effects and durability.

## Errors and completion

### Discovery records

Each interactive session publishes one private discovery record for its control endpoint under the runtime directory and removes it on ordinary shutdown. Atomic record replacement retries brief Windows sharing errors for up to 750 ms while preserving the previous complete record; permanent errors or sustained contention still fail closed. Old session identities remain rejected throughout replacement, and request deadlines are unchanged. A session that ends abruptly (closed terminal, Core kill, crash, reboot) leaves its record behind. A1 prunes such records when it can prove the owner process is gone: once, bounded in time and count, when a session starts its endpoint, and opportunistically while a lookup scans the directory. Records of live processes, records that cannot be parsed and records of unknown format are never removed automatically. `control-limit` is raised when more than 256 live candidates are examined or when the directory exceeds a much larger raw ceiling, so a flooded directory still fails closed; a machine with many abruptly ended sessions keeps a working API without manual cleanup.

Stable request errors: `invalid-request`, `unsupported-version`, `unsupported-operation`, `target-required`, `invalid-target`, `unsupported-profile`, `unsupported-scope`, `unsupported-setting`, `invalid-value`. Name concurrency refusal: `name-conflict`. Exit refusals: `session-stopping`, `session-busy`, `editor-not-empty`, `pending-input`, `overlay-open`. Runtime/transport failures include `session-unavailable`, `ambiguous-session`, `request-expired`, `control-boundary`, `control-limit`, `control-failed`, `settings-failed`, `invalid-response`, `response-limit`. Error messages are diagnostics, not machine contracts.

An update is acknowledged only after its owning service applies or durably stores it. Requests retain nonce, process liveness, exact runtime/session, binding-generation, serialization and deadline fencing in private local IPC. Expired/disconnected queued work cannot replay onto a replacement. Lost acknowledgement is an unknown outcome: read back a fresh exact target instead of automatic retry/replay. Client JSON parsing alone is insufficient: validate version, ID, response type, command, target, setting, value and completion status. Structured failures must remain available to callers.

## Coordinated Herdr rollout

The canonical consumer is external, under `C:/Users/tprokopiev/.config/herdr-app/customizations/`, tracked by yadm rather than this PR. Its source is preserved in `timurproko/MyConfigs` branch `refactor/shared-a1-api`, commit `6cec0e8e`, draft PR #1. This A1 PR does not include those external source files. It must use this candidate protocol for live matching; old dedicated color routes and legacy `custom.a1.*` discovery are retired. Native labels are hints, not authority: the runtime still validates the exact binding. Startup transformation targets the coordinated current installation without a capability probe, and retains conservative argv matching and explicit user overrides.

Build/test both sides against disposable fixtures. Do not deploy the breaking consumer until target A1 installations support this contract. Old running sessions remain usable but unavailable for new control; never restart them, inject input, or repair labels automatically. Publication and deployment require separate authorization. Source and customization build are prepared, not deployed. Any separately installed legacy companion reference must be removed by its owner before a future deployment removes its old generated worker. Relative explicit executable paths are deliberately unsupported for external control because a worker cannot assume the launch cwd; absolute configured installations never fall back to PATH.
