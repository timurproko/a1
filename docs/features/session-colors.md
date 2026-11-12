# Session colors and local API

Bare A1 offers two Settings → Appearance controls:

- **Default color** is saved in the active profile as `defaultAccentColor`. It initially resolves to blue. It controls the next session start, not the running interface.
- **Current color** applies immediately to this active session only. It is not saved to profile settings and does not propagate to other sessions on the same machine, profile, or project.

Both menus offer **blue → green → orange → pink → purple → cyan → grey**, with color previews. There is no automatic/dashed option. Grey keeps the derived semantic family and accent canvas neutral; unrelated success/warning/error colors are unchanged.

A fresh launch, resumed transcript, or successful new/resume/fork/import replacement initializes Current color from the latest saved Default color. Missing or invalid defaults resolve to blue. A failed replacement retains the old session and color. Changing the saved default does not recolor any running session. Cancel and undo respect each setting's storage scope.

The legacy profile `accentColor` key is retained but ignored by interactive color resolution. Current colors never overwrite it. The comparison `a1 pi` profile is unchanged. Standalone installation/update progress keeps its existing saved-profile preference policy.

## Integration commands

External applications such as Herdr can invoke the installed CLI as a subprocess. These commands always return JSON without a `--json` switch:

| Arguments after `a1` | Result |
| --- | --- |
| `session color list` | Available color identifiers in display order; no running session needed |
| `session color get --session <id>` | One live session's Current color |
| `session color set pink --session <id>` | Set only that session's Current color and acknowledge the applied value |

The selector is a **complete session UUID**, shown by A1's Session Info workflow. It is not a PID, terminal index, abbreviated prefix, transcript path, or machine-wide current session. Get/set require one explicitly targeted live bare-A1 session outside an A1 shell. Within a shell launched by that exact session, omission uses the existing `PI_SESSION_ID`, `PI_SESSION_FILE`, and A1 runtime identity together; it never selects a different session implicitly. Keep the runtime-directory environment consistent when controlling a custom runtime root.

Get/set do not change Default color. Configure the startup preference in Settings. An API write immediately updates the Current color value visible there, along with semantic colors and accent-derived backgrounds.

### Responses

Inventory returns only the color list, not a hard-coded default that could be confused with the configured startup preference:

```json
{"colors":["blue","green","orange","pink","purple","cyan","grey"]}
```

Get and successful set use the same shape:

```json
{"sessionId":"57e38e80-f348-4b28-b791-7cc080886a70","color":"pink"}
```

Failures return:

```json
{"error":{"code":"session-unavailable","message":"Select one running bare session by its complete session id."}}
```

Exactly one newline-terminated JSON object is written to stdout, without progress or human-readable prefixes. Error messages are explanatory text and can evolve; applications should branch on `error.code`. Exit statuses:

- **0:** successful list/get/applied set.
- **2:** invalid arguments, color, session format, or missing required selector.
- **1:** unavailable/ambiguous target, timeout, or control failure.

Error codes include `invalid-request`, `invalid-color`, `invalid-session`, `session-required`, `session-unavailable`, `ambiguous-session`, `request-expired`, `control-boundary`, `control-limit`, and `control-failed`. Hosts without a color command adapter return `control-unavailable`. Ordinary `session color help` and global help remain human-readable. CLI capability metadata advertises `sessionColors: true`.

### Herdr integration

Invoke `a1` with an argument array rather than interpolating a shell string. For example, pass `["session", "color", "set", "pink", "--session", sessionId]`, capture stdout, await process completion, and parse its one JSON object. On exit 0, update Herdr's local UI from the returned `sessionId` and `color`. On nonzero exit, display or handle the structured error; do not treat a queued write or process creation as successful application. No subscription/event feed or host-app icon recoloring is provided.

## Lifetime and safety

Control starts alongside the interactive shell and stops with it. It uses an in-process local IPC endpoint: a Windows named pipe or Unix-domain socket, with bounded private discovery records under the runtime directory. It does not introduce a separate resident service, TCP port, or HTTP server. Comparison-profile sessions do not publish endpoints.

Requests have a three-second end-to-end budget, bounded payloads, process-liveness checks, runtime identity, a private endpoint nonce, session binding checks, and correlated acknowledgements. Concurrent requests serialize in the target runtime. Set reports success only after its live settings change path applies the color. Requests still queued after expiry, disconnect, stop, or session replacement cannot recolor a later session. A timeout means application was not acknowledged: a change already applied just before a lost response is not rolled back; get the current value before deciding whether to retry. No delayed request is persisted for future replay.

Private runtime records are not a public file-editing API. Do not write settings files or edit endpoint records to control Current color. Unverifiable, ambiguous, replaced, stopped, malformed, and comparison-profile targets fail closed without choosing another session. An unavailable control directory or failed endpoint startup leaves the interactive session usable, but external control reports unavailable. Worktree attachment authority is unaffected.
