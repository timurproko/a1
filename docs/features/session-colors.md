# Session colors and local API

Bare A1 offers two Settings → Appearance controls:

- **Default color** is saved in the active profile as `defaultAccentColor`. It initially resolves to blue. It controls the next session start, not the running interface.
- **Current color** applies immediately to this active session only. It is not saved to profile settings and does not propagate to other sessions on the same machine, profile, or project.

Both menus offer **blue → green → orange → pink → purple → cyan → grey**, with color previews. There is no automatic/dashed option. Grey keeps the derived semantic family and accent canvas neutral; unrelated success/warning/error colors are unchanged.

A fresh launch, resumed transcript, or successful new/resume/fork/import replacement initializes Current color from its invocation override when present, otherwise the latest saved Default color. Missing or invalid defaults resolve to blue. A failed or cancelled replacement retains the old session and color. Changing the saved default does not recolor any running session. Live Current color edits and cancel/undo do not change the invocation's replacement policy.

The legacy profile `accentColor` key is retained but ignored by interactive color resolution. Current colors never overwrite it. The comparison `a1 pi` profile is unchanged. Standalone installation/update progress keeps its existing saved-profile preference policy.

## Invocation-only startup color

`a1 --session-color green` selects green before the first visible startup, project-trust, or editor frame, even when Default color is pink. Valid names are the same seven menu colors. The option may accompany `--session <path|id>` and optional `--session-dir <dir>` in either order. Missing, invalid, or repeated colors fail before interactive rendering. `--session-dir` still requires `--session`.

The override is not a setting or environment variable: it never changes saved Default, writes project/profile color settings, recolors a peer, or leaks a launch-color variable into agent tools or the eventual shell. It remains the initial color for successful replacements in that runtime. For example, after launching green, a live API set can make Current pink immediately; the next successful replacement starts green again. Without the option, replacements continue reading the latest saved Default rather than a process-start snapshot.

The first `--` ends option parsing. A declared normal launch can carry a literal prompt after it, submitted once through the owned prompt command after successful startup and first presentation. `a1 --session-color green -- --session-color pink` starts green and submits the text `--session-color pink`, not a second option. An explicit boundary without a color uses ordinary Default initialization. Token order/text is preserved and joined with spaces at prompt submission; quotes/metacharacters are not shell-evaluated. Grammar/startup failure or trust exit does not submit the prompt. Arbitrary leading words, comparison operations, and unrelated Pi flags remain outside the supported launch grammar.

Bootstrap carries the value in owned literal child arguments, not Pi flags. If a selected older retained UI cannot consume this startup payload, the explicit override fails before rendering rather than silently showing Default; ordinary no-override release fallback remains available. Comparison mode and unrelated installation/update progress are unchanged.

## Integration commands

External applications such as Herdr can invoke the installed CLI as a subprocess. These commands always return JSON without a `--json` switch:

| Arguments after `a1` | Result |
| --- | --- |
| `session color capabilities` | Version-1 delivered startup-color and automatic terminal-identity support; no interactive/Core startup |
| `session color list` | Available color identifiers in display order; no running session needed |
| `session color get --session <id>` | One live session's Current color |
| `session color set pink --session <id>` | Set only that session's Current color and acknowledge the applied value |

The selector is a **complete session UUID**, shown by A1's Session Info workflow. It is not a PID, terminal index, abbreviated prefix, transcript path, or machine-wide current session. Get/set require one explicitly targeted live bare-A1 session outside an A1 shell. Within a shell launched by that exact session, omission uses the existing `PI_SESSION_ID`, `PI_SESSION_FILE`, and A1 runtime identity together; it never selects a different session implicitly. Keep the runtime-directory environment consistent when controlling a custom runtime root.

Get/set do not change Default color. Configure the startup preference in Settings. An API write immediately updates the Current color value visible there, along with semantic colors and accent-derived backgrounds.

### Responses

Capability discovery succeeds with exactly this object followed by one newline:

```json
{"version":1,"launchColor":true,"terminalIdentity":true}
```

It reports delivered implementation support even outside Herdr or with unavailable Core. It does not initialize an interactive profile, ask for trust, start an endpoint/reporter, or probe Core. Hosts should require version 1 and both booleans before adding the startup option; older/missing/failed/malformed discovery leaves ordinary launching available without an override. Probe the configured installation on the target machine, not a desktop installation when launching over SSH.

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

- **0:** successful capabilities/list/get/applied set.
- **2:** invalid arguments, color, session format, or missing required selector.
- **1:** unavailable/ambiguous target, timeout, or control failure.

Error codes include `invalid-request`, `invalid-color`, `invalid-session`, `session-required`, `session-unavailable`, `ambiguous-session`, `request-expired`, `control-boundary`, `control-limit`, and `control-failed`. Hosts without a color command adapter return `control-unavailable`. Ordinary `session color help` and global help remain human-readable. CLI capability metadata advertises `sessionColors: true`.

### Herdr integration

Invoke `a1` with an argument array rather than interpolating a shell string. For example, pass `["session", "color", "set", "pink", "--session", sessionId]`, capture stdout, await process completion, and parse its one JSON object. On exit 0, update Herdr's local UI from the returned `sessionId` and `color`. On nonzero exit, display or handle the structured error; do not treat a queued write or process creation as successful application. No subscription/event feed or host-app icon recoloring is provided.

## Automatic Herdr Core terminal identity

Interactive bare A1 inside a valid local `HC_TERMINAL_ID` reports through the supported local Core CLI. Only **Core + A1 + its normal Node runtime** are needed on the local or SSH machine; no Herdr App, customization tree, extension, manually installed companion, daemon, or additional port is required.

| Native terminal label | Value |
| --- | --- |
| `a1.session` | Complete active session/history UUID accepted by Current-color control |
| `a1.runtime` | Exact A1 runtime UUID used by that endpoint |
| `a1.at` | Publication-attempt time in Unix epoch milliseconds |

All three labels are submitted together after the color endpoint is available. Replacement reporting follows successful endpoint binding publication. Heartbeats refresh approximately every 30 seconds; replacement requests coalesce behind in-flight work. Comparison/noninteractive modes and absent/invalid Core context publish nothing. Missing `hc`, unavailable Core, subprocess failure, or endpoint startup failure never prevents ordinary interactive use.

Subprocess invocation uses literal arguments and captures bounded output. Command resolution has a 200 ms budget, execution 750 ms, and failed-process settlement 250 ms, with a 128 KiB combined-output limit. Unix uses the PATH executable; Windows supports an actual executable or an npm shim's resolved Node script, never arbitrary batch-wrapper execution. Failures retry only on normal heartbeat or a committed replacement, not a rapid poll loop.

### Ownership and cleanup

A1 reserves an ordered per-terminal generation before asynchronous interactive startup. A small per-user local fence under `~/.a1/herdr-bindings/` serializes reporting runtimes independently of profile/release/development roots. Even alternate local Core contexts conservatively share this terminal-address fence. These are A1-owned runtime records, not profile settings or discovery of private color endpoint records.

A newer reservation permanently supersedes an older one: old heartbeats, late initial publication, replacement callbacks, and shutdown cannot reclaim or clear the newer binding, even after the successor exits. Refresh/cleanup checks both the local generation and the exact public runtime/session/timestamp binding under the fence. Shutdown stops scheduling/subscriptions, settles in-flight work, and removes only this runtime's still-owned native labels. Unrelated and legacy labels remain untouched.

Partial/foreign/malformed labels or unverifiable coordination fail closed rather than authorize a takeover or deletion. A crash or an unverified subprocess settlement leaves its fence locked: A1 does not steal locks based on age or PID. Subsequent reporting for that terminal may be disabled until an operator verifies and resolves the exact residue; normal A1 use continues and stale consumer bindings expire. Do not delete an ownership fence or its generation record while any related runtime or subprocess may still write. Core's label API has no conditional write, so this cooperative guarantee does not claim atomic protection against arbitrary external writers of native keys.

### Matching and compatibility boundary

Herdr treats complete native `a1.*` identity as authoritative over the optional legacy companion's `custom.a1.*`. A partial native binding fails closed and cannot borrow legacy values; legacy fallback is permitted only when all three native keys are absent. A1 never edits companion package references or configuration.

The supplied Herdr consumer freshness contract is 90 seconds with five seconds of future-clock tolerance. Fresh labels alone are not control authority: the host must also validate a live A1 target and current terminal/space/tab membership, use short-expiry requests, and honor acknowledged API responses. Do not infer a target from titles, PIDs, transcripts, or private endpoint files.

First-frame space matching covers supported explicit Herdr A1-profile launches in an existing identified space. Herdr chooses the latest space color immediately before launch, requires both discovered capabilities, and passes no override when matching is disabled. Custom wrappers/unrelated profiles are not rewritten, and conflicting configured startup-color options should be refused rather than silently replaced. Manually launched Core-hosted A1 gains public identity and subsequent live matching, not a first-frame host handshake. Launches into new spaces without a known space ID retain live-sync fallback.

## Lifetime and safety

Control starts alongside the interactive shell and stops with it. It uses an in-process local IPC endpoint: a Windows named pipe or Unix-domain socket, with bounded private discovery records under the runtime directory. It does not introduce a separate resident service, TCP port, or HTTP server. Comparison-profile sessions do not publish endpoints.

Requests have a three-second end-to-end budget, bounded payloads, process-liveness checks, runtime identity, a private endpoint nonce, session binding checks, and correlated acknowledgements. Concurrent requests serialize in the target runtime. Set reports success only after its live settings change path applies the color. Requests still queued after expiry, disconnect, stop, or session replacement cannot recolor a later session. A timeout means application was not acknowledged: a change already applied just before a lost response is not rolled back; get the current value before deciding whether to retry. No delayed request is persisted for future replay.

Private runtime records are not a public file-editing API. Do not write settings files or edit endpoint records to control Current color. Unverifiable, ambiguous, replaced, stopped, malformed, and comparison-profile targets fail closed without choosing another session. An unavailable control directory or failed endpoint startup leaves the interactive session usable, but external control reports unavailable. Worktree attachment authority is unaffected.
