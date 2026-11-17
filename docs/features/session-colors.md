# Session colors and local API

Normal A1, launched ordinarily or through the packaged Pi-compatible entry, offers two Settings → Appearance controls. Both launchers expose the same public color API and native Herdr identity contract; the distinct `a1 pi` comparison profile remains excluded.


- **Default color** is saved in the active profile as `defaultAccentColor`. It initially resolves to blue. It controls the next session start, not the running interface.
- **Current color** applies immediately to this active session only. It is not saved to profile settings and does not propagate to other sessions on the same machine, profile, or project.

Both menus offer **blue → green → orange → pink → purple → cyan → grey**, with color previews. There is no automatic/dashed option. Grey keeps the derived semantic family and accent canvas neutral; unrelated success/warning/error colors are unchanged.

A fresh launch, resumed transcript, or successful new/resume/fork/import replacement initializes Current color from its invocation override when present, otherwise the latest saved Default color. Missing or invalid defaults resolve to blue. A failed or cancelled replacement retains the old session and color. Changing the saved default does not recolor any running session. Live Current color edits and cancel/undo do not change the invocation's replacement policy.

The legacy profile `accentColor` key is retained but ignored by interactive color resolution. Current colors never overwrite it. The comparison `a1 pi` profile is unchanged. Standalone installation/update progress keeps its existing saved-profile preference policy.

## Invocation-only startup color

`a1 --session-color green` selects green before the first visible startup, project-trust, or editor frame, even when Default color is pink. Valid names are the same seven menu colors. The option may accompany `--session <path|id>` and optional `--session-dir <dir>` in either order. Missing, invalid, or repeated colors fail before interactive rendering. `--session-dir` still requires `--session`.

The override is not a setting or environment variable: it never changes saved Default, writes project/profile color settings, recolors a peer, or leaks a launch-color variable into agent tools or the eventual shell. It remains the initial color for successful replacements in that runtime. For example, after launching green, a live API set can make Current pink immediately; the next successful replacement starts green again. Without the option, replacements continue reading the latest saved Default rather than a process-start snapshot.

The first `--` ends option parsing. A declared normal launch can carry a literal prompt after it, submitted once through the owned prompt command after successful startup and first presentation. `a1 --session-color green -- --session-color pink` starts green and submits the text `--session-color pink`, not a second option. An explicit boundary without a color uses ordinary Default initialization. Token order/text is preserved and joined with spaces at prompt submission; quotes/metacharacters are not shell-evaluated. Grammar/startup failure or trust exit does not submit the prompt. Arbitrary leading words, comparison operations, and unrelated Pi flags remain outside the supported launch grammar.

Bootstrap carries the value in owned literal child arguments, not Pi flags. Support is checked against authenticated evidence for the exact selected release, including its full manifest when compact restart evidence contains only the UI entry. A compatible release accepts color and literal prompts on cold and repeated warm launches; creating restart certification does not remove that support.

If the selected retained UI genuinely cannot consume this startup payload, or its required evidence cannot be verified, startup fails before spawning that UI rather than silently dropping the color or prompt. Installed capability discovery does not authorize a different unsupported retained release. Ordinary no-payload launch and fallback behavior, comparison mode, and unrelated installation/update progress are unchanged.

## Shared integration API

The [versioned integration API](integration-api.md) replaces all dedicated color commands. Invoke `a1` with literal arguments `["api", JSON.stringify(request)]`. Discover operations with `capabilities` and color choices with `settings.list`; neither starts a session or probes Core.

Current color is setting `accentColor`, addressed with both complete session and runtime UUIDs in a session target. Read/update return correlated versioned envelopes, exact target, stored/effective values and application metadata. Live updates acknowledge `status: applied` only after the shared Settings authority adopts the value. Profile `defaultAccentColor` updates acknowledge durable `status: stored` for future initialization, not live recoloring. No ambient shell selector or retired-command fallback remains. Keep the runtime-directory environment consistent for custom runtime roots.

Clients must validate envelope version, correlation ID, operation, target and applied readback, not merely JSON parse success. Exit zero means success; failures are nonzero with structured error codes. Discovery and all ordinary calls emit exactly one bounded LF-terminated JSON response. There is no subscription feed or host-app icon recoloring.

## Automatic Herdr Core terminal identity

Interactive bare A1 inside a valid local `HC_TERMINAL_ID` reports through the supported local Core CLI. Only **Core + A1 + its normal Node runtime** are needed on the local or SSH machine; no Herdr App, customization tree, extension, manually installed companion, daemon, or additional port is required.

| Native terminal label | Value |
| --- | --- |
| `a1.session` | Complete active session/history UUID accepted by Current-color control |
| `a1.runtime` | Exact A1 runtime UUID used by that endpoint |
| `a1.at` | Publication-attempt time in Unix epoch milliseconds |
| `a1.cwd` | Absolute active project directory, not the Node process or parent shell launch directory |

Identity and directory labels are submitted together after the control endpoint is available. Invalid or unavailable directories omit `a1.cwd` without suppressing identity. Paths are bounded to 4096 UTF-8 bytes and reject controls. Successful worktree attach/switch/detach/completion follows the newly published active backend context; queued or rejected targets are not directory sources. The private Herdr directory resolver prefers a complete fresh native A1 directory over stale foreground/shell cwd, keeping Git repository/branch reads on that terminal's machine. These hints never grant control authority, and reporting is independent of optional plugin switches. Older identity-only producers retain ordinary directory fallbacks; already-running releases need an owner-managed upgrade when safe. Replacement reporting follows successful endpoint binding publication. Heartbeats refresh approximately every 30 seconds; replacement requests coalesce behind in-flight work. Comparison/noninteractive modes and absent/invalid Core context publish nothing. Missing `hc`, unavailable Core, subprocess failure, or endpoint startup failure never prevents ordinary interactive use.

Subprocess invocation uses literal arguments and captures bounded output. Command resolution has a 200 ms budget, execution 750 ms, and failed-process settlement 250 ms, with a 128 KiB combined-output limit. Unix uses the PATH executable; Windows supports an actual executable or an npm shim's resolved Node script, never arbitrary batch-wrapper execution. Failures retry only on normal heartbeat or a committed replacement, not a rapid poll loop.

### Ownership and cleanup

A1 records ordered per-terminal launch intent before asynchronous interactive startup. A short local metadata transaction orders that intent independently of slow Core calls. The original per-user settlement fence under `~/.a1/herdr-bindings/` still serializes actual reporting and committed publication ownership independently of profile/release/development roots. Even alternate local Core contexts conservatively share this terminal-address fence. These are A1-owned runtime records, not profile settings or discovery of private color endpoint records.

A legitimate predecessor publication can outlast a startup reservation attempt. The latest eligible runtime now retains pending intent and retries bounded promotion on the ordinary heartbeat or a committed replacement, rather than losing reporting permanently. Promotion waits for verified predecessor settlement and preserves its exact acknowledged public binding. A later intent permanently revokes an earlier pending one, including after the later runtime exits. Shutdown cancels pending work and never promotes an unready owner. Existing participating older reporters remain fenced by the original committed generation and settlement guard; unverifiable or conflicting records remain blocked.

A newer ordered intent permanently supersedes an older one: old heartbeats, late initial publication, replacement callbacks, and shutdown cannot reclaim or clear the newer binding, even after the successor exits. Refresh/cleanup checks both the local generation and the exact public runtime/session/timestamp/directory binding under the fence. Identity-only publication records remain readable for predecessor handoff. Shutdown stops scheduling/subscriptions, settles in-flight work, and removes only this runtime's still-owned native labels. Unrelated and legacy labels remain untouched.

Partial/foreign/malformed labels or unverifiable coordination fail closed rather than authorize a takeover or deletion. A crash or an unverified subprocess settlement leaves its fence locked: A1 does not steal locks based on age or PID. Subsequent reporting for that terminal may be disabled until an operator verifies and resolves the exact residue; normal A1 use continues and stale consumer bindings expire. Do not delete an ownership fence or its generation record while any related runtime or subprocess may still write. Core's label API has no conditional write, so this cooperative guarantee does not claim atomic protection against arbitrary external writers of native keys.

### Matching and compatibility boundary

Herdr accepts only complete fresh native `a1.*` identity. Partial native bindings and legacy `custom.a1.*` labels never authorize control. A1 leaves unrelated legacy labels and companion configuration untouched; neither project installs a compatibility companion for this protocol.

The supplied Herdr consumer freshness contract is 90 seconds with five seconds of future-clock tolerance. Fresh labels alone are not control authority: the host must also validate a live A1 target and current terminal/space/tab membership, use short-expiry requests, and honor acknowledged API responses. Do not infer a target from titles, PIDs, transcripts, or private endpoint files.

Once a normal or compatible session reports its ready identity, same-machine tab moves use the existing consumer's current destination membership and adoption labels, including inactive tabs. No focus change, producer restart or alternate color API is needed. A move after the consumer's final membership check can still race an already-admitted color write: the host API does not provide a membership-and-color transaction.

New producer code does not hot-patch an already running immutable release. An existing session with unavailable identity must be updated/relaunched by its owner when safe; never clear its labels or coordination files or restart it as an automatic color repair.

First-frame space matching covers supported explicit Herdr A1-profile launches in an existing identified space. Herdr targets the coordinated current A1 contract without startup capability probes, chooses the latest space color immediately before launch, and passes no override when matching is disabled. Custom wrappers/unrelated profiles are not rewritten, and conflicting configured startup-color options should be refused rather than silently replaced. Manually launched Core-hosted A1 gains public identity and subsequent live matching, not a first-frame host handshake. Launches into new spaces without a known space ID retain live-sync fallback.

## Lifetime and safety

Control starts alongside the interactive shell and stops with it. It uses an in-process local IPC endpoint: a Windows named pipe or Unix-domain socket, with bounded private discovery records under the runtime directory. It does not introduce a separate resident service, TCP port, or HTTP server. Comparison-profile sessions do not publish endpoints.

Requests have a three-second end-to-end budget, bounded payloads, process-liveness checks, runtime identity, a private endpoint nonce, session binding checks, and correlated acknowledgements. Concurrent requests serialize in the target runtime. Set reports success only after its live settings change path applies the color. Requests still queued after expiry, disconnect, stop, or session replacement cannot recolor a later session. A timeout means application was not acknowledged: a change already applied just before a lost response is not rolled back; get the current value before deciding whether to retry. No delayed request is persisted for future replay.

Private runtime records are not a public file-editing API. Do not write settings files or edit endpoint records to control Current color. Unverifiable, ambiguous, replaced, stopped, malformed, and comparison-profile targets fail closed without choosing another session. An unavailable control directory or failed endpoint startup leaves the interactive session usable, but external control reports unavailable. Worktree attachment authority is unaffected.
