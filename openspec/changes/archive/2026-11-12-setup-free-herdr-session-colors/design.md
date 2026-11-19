## Context

The source handoff is `a1-herdr-space-colors-plan.md`, supplied from Herdr's file store. It states that Herdr's consumer is implemented and deployed behind discovery; this planning pass has not independently verified that deployment. The referenced customization contract and consumer files are absent at the supplied local paths. Their exact public contract is preserved below, not renamed or inferred from titles, PIDs, or transcripts.

Planning starts at refreshed `origin/develop` commit `c39a95552f7be42f1f7c83f7b3fdf8d92203d965`. The prepared external worktree and branch no longer existed. `a1 worktree enter feature/herdr-session-colors` created and attached `D:/Git/a1/.worktrees/herdr-session-colors`; no foreign checkout was adopted. The first commit contained OpenSpec planning artifacts only. The maintainer subsequently approved this plan and requested implementation in the same PR; integration authority remains separate.

### Current owner seams

- `src/cli/dispatch.ts` recognizes bare launch and explicit session selection, delegates color commands, and deliberately treats unsupported words as silent no-ops. It does not currently accept arbitrary prompts, arbitrary Pi flags, or `--` prompt forms.
- `src/features/launch/intent.ts` carries a frozen interactive intent; `prepare-launch.ts` selects/initializes the profile. `bin/cli.js` hands intent to `src/foundation/release/bootstrap.ts`, which currently encodes session selection into a literal child argv array. `bin/ui.js` parses selection before runtime composition.
- `bin/ui.js` creates a fresh bare-A1 runtime UUID rather than inheriting its parent's. Composition and the color endpoint use that identity.
- `src/ui/settings/early-accent.ts` reads only the global `defaultAccentColor` with blue fallback. `src/features/owned-ui/project-trust-prompt.ts` uses that fixed startup-safe palette before project resources are available.
- `OwnedSettingsManager` calls `startSession()` in its constructor, seeds session-local values from declared durable sources, and never persists Current color. `src/composition/owned-ui.ts` observes committed binding-generation changes and invokes `startSession()` for replacements.
- `src/composition/session-colors.ts` starts the authenticated local control endpoint, publishes its binding after generation changes, and serializes endpoint publication/disposal. Its active selector is `currentHistorySessionId() ?? sessionId`, not a transcript-derived or truncated identity.

Read-only local Core CLI/schema inspection confirms `hc label <terminal> k=v...`, `key=` removal, and `hc get <terminal> --json` exposing canonical address and a labels map. The installed schema has no compare-and-set parameter for `terminal.label`. No live terminal facts were inspected or labels changed during planning.

## Goals / Non-Goals

**Goals**

1. First visible A1 startup/trust/editor presentation uses a validated Herdr-selected launch color for supported launches in an existing identified space.
2. Core-hosted bare A1 publishes complete fresh public identity automatically on local and SSH machines with only Core, A1, and normal Node.
3. Default color remains durable; Current color remains local and immediately controllable through the existing acknowledged API.
4. Missing or failed integration is optional, bounded, and cannot prevent ordinary A1 use.

**Non-goals**

- A Core handshake guaranteeing first-frame space color for manually started A1 or launches without a known space ID.
- Herdr App installation, companion/configuration migration, consumer rewrites, remote credentials/configuration changes, additional services or ports.
- Comparison-profile customization, broad positional prompt/Pi-option passthrough, or changes to unrelated installer/update progress.
- Live-agent smoke tests, desktop automation, restarts, terminal typing, or merge/finalization authority.

## Decisions

### 1. Preserve the public discovery contract exactly

`a1 session color capabilities` succeeds with exactly:

```json
{"version":1,"launchColor":true,"terminalIdentity":true}
```

followed by one newline, exit zero, with no progress on stdout. Discovery runs in the command adapter without profile initialization, project trust, interactive composition, endpoint startup, Core probing, or a resident child. It describes delivered support, not whether this invocation is inside Core or whether Core is reachable.

The first implementation outcome may expose `launchColor: true, terminalIdentity: false`; outcome two turns on `terminalIdentity` only after the reporter and its tests are written. No hard-coded premature `true`. Final delivery must expose both booleans exactly as above. Existing list/get/set success/error shapes and post-application acknowledgements remain byte-compatible.

Herdr probes the configured installation on the target machine. A missing/older/malformed/failed discovery result leaves ordinary launching available without the option. This change does not alter those consumer decisions.

### 2. Carry a typed invocation value, never an inheritable color environment setting

The CLI/launch owner validates exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey`. Missing, invalid, and repeated `--session-color` values produce focused nonzero grammar failure before interactive rendering. Session selection and color may occur in either option order; `--session-dir` still requires `--session`.

Extend the existing interactive intent and composition options with one validated optional initial-color value. Release foundation must not import the product launch feature: its structural launch contract can carry neutral validated presentation data while launch/composition own palette policy. Extend an existing neutral contract only where an actual producer and consumer need the field; do not add a process global or generic settings-override framework.

Encode the value as literal owned child argv, retaining it through warm/cold materialization, reselection, development launches, and supported retained release paths. The UI entry consumes the owned option; it never reaches a Pi parser as an unknown flag. No color environment variable is introduced, persisted, copied into tool environments, or left in the eventual shell.

A selected older retained UI cannot safely receive a new unknown option. Inspect existing release/launch compatibility checks and add the smallest supported-payload guard needed to fail an explicit unsupported override before interactive rendering, without silently dropping the color or changing ordinary no-override fallback. Do not bypass release certification/activation or execute incompatible retained code to claim first-frame support.

### 3. Define the literal boundary narrowly instead of inventing a general launch grammar

Options are recognized only before the first `--`. Color-looking tokens after it are never consumed or rejected as color options. For an explicitly supported normal launch (owned color/session options, or an explicit boundary), an optional post-boundary literal prompt is carried as data through the owned launch path. Preserve token order and text, including strings such as `--session-color`, quotes, spaces, and metacharacters; join prompt tokens using the normal space-delimited prompt convention only at the owned prompt-submission boundary. Never reconstruct/evaluate a shell command or reparse this payload as CLI options.

Because bare A1 currently has no literal-prompt launch form, this is a narrowly proposed addition needed to satisfy the supplied boundary contract, not a claim of existing behavior. Submit any nonempty boundary prompt once through the existing owned prompt command after the selected session and first frame are ready, respecting trust and session-selection failure. Do not submit it on grammar failure, trust exit, or failed startup. Keep arbitrary leading words, unknown options outside this declared form, removed launch words, and comparison/package commands under today's unsupported-command policy. Do not expose resume/continue aliases or arbitrary Pi arguments.

Document this addition and its deterministic tests in outcome one so approval covers its precise scope. `a1 --session-color green -- --session-color pink` starts green and treats the remaining text as prompt content, not as a second override. A no-override explicit boundary uses ordinary Default initialization.

### 4. Apply before first paint and retain a replacement policy separate from Current state

Pass the validated value explicitly to the startup-safe trust palette resolver and console trust prompt. It wins before the first owned interactive frame; absent override uses the effective global saved Default with blue fallback. Never consult project settings/themes/resources before trust. Comparison styling and trust choices, persistence, cancellation, raw-mode/cursor restoration remain unchanged.

Pass the value to the settings-manager construction path before it seeds Current color and before engine host/theme/shell construction can paint. Keep a private immutable per-invocation initial-color policy: override if present, otherwise read the latest valid durable Default on each successful session boundary. The existing `startSession()` binding-generation hook applies this policy after committed new/resume/fork/import, not while a replacement is pending or cancelled.

Settings/API writes modify only the authoritative Current value, never the retained invocation policy. Saving/undoing Default, peer reload, or unrelated settings writes do not modify that policy or repaint an existing Current color. A failed/cancelled replacement retains session, binding generation, and Current color. No override preserves today's latest-Default behavior, not a process-start snapshot.

### 5. Reporter is an optional owned-UI lifecycle service with an explicit subprocess port

Keep Core-specific reporting and command resolution in a small owned-UI feature module/adapter, composed by `src/composition/session-colors.ts` and `owned-ui.ts`. Expose only necessary types/ports through owner public entries; dependency-free contracts never import subprocess/Core/Pi code. Reuse existing dependencies and safe Node filesystem primitives where needed; do not introduce an integration framework or new foundation owner for one product-specific consumer.

Inputs are the valid local Core terminal context, exact runtime UUID, and the color endpoint's active history/session UUID and binding generation. Validate complete UUIDs with the endpoint's accepted semantics. Validate `HC_TERMINAL_ID` as a supported local canonical terminal identifier, not a title, mutable name, guessed PID, or arbitrary remote selector. Resolve/check canonical address via the public Core API, consuming only address/labels needed for ownership and never terminal screen/transcript/argv content for matching.

Publish all three labels together in one bounded literal-argument invocation:

- `a1.session`: complete active session/history UUID accepted by Current-color control.
- `a1.runtime`: exact runtime UUID used by that endpoint.
- `a1.at`: actual publication-attempt Unix epoch milliseconds, updated for every refresh (not process start time).

No Core subprocess is spawned outside a valid Core context, in comparison mode, or by noninteractive commands. Reporter publication starts only after `serveSessionControl` succeeds. For replacement, capture the committed identity, await endpoint binding publication, recheck that identity/generation is still current, and publish promptly. Endpoint startup failure must never leave a newly advertised usable binding.

Use roughly 30-second heartbeat with one serialized in-flight job and coalesced replacement triggers. No setInterval queue accumulation, rapid retry loop, or immediate repeated spawn on missing `hc`. Each subprocess, output capture, lock acquisition, and shutdown wait has a finite timeout/size budget; the implemented execution deadline is 750 ms, resolution budget 200 ms, settlement budget 250 ms, and combined-output limit 128 KiB, named in owner code/tests. An uncertain timed-out write must settle or retain its ownership fence before any successor is allowed to publish.

Errors are best-effort, not startup exceptions or stdout contamination. Retry normal publication failures only at the next normal heartbeat; a successful replacement can request one prompt update. Stop timers/subscriptions first on disposal, drain/abort bounded outstanding work, then attempt ownership-checked cleanup while endpoint identity is still available, and finally dispose endpoint coordination.

### 6. Cross-runtime fencing is required; read-then-write alone is rejected

A Promise chain prevents one reporter racing itself but cannot stop an older process overwriting a newer runtime's labels. The public `hc label` API does not expose CAS. Therefore use a small A1-local, per-terminal ownership fence/lock shared by reporting runtimes, independent of profile settings and keyed conservatively by canonical local terminal identity in a shared OS-user home namespace. Alternate local Core contexts also share this fence rather than risk profile-dependent ownership keys. It is A1's own coordination, not discovery of private color endpoint records or a new resident service.

Reserve an ordered runtime generation during early bare runtime setup, before asynchronous endpoint/publication work can be delayed. Reservation never publishes usable labels. A successor supersedes the earlier generation under the same cross-process lock. A superseded runtime permanently loses publication authority: heartbeat, replacement callback, delayed first publication, and disposal cannot reacquire/overwrite/clear that successor. Retain enough fence information to prevent an old runtime reclaiming the terminal after a successor exits; do not erase the generation fence simply because public labels are cleared.

All cooperating reporter writes/cleanup hold that per-terminal fence through the bounded Core operation. Recheck local generation/runtime ownership and the public `a1.runtime` label before refresh/removal. Initial takeover uses the ordered reservation, not label freshness, lexical UUID ordering, PID-only liveness, or publication timestamp. Never infer ownership from `a1.session` alone, because two runtimes may resume the same history UUID.

Cleanup removes only owned native keys, with exact runtime and published identity checks. A partial/malformed/foreign binding is not clearance authority; fail closed and leave it to expire rather than wiping another binding. Unrelated and `custom.a1.*` labels are untouched. If locking, namespace resolution, process settlement, filesystem identity, or public ownership cannot be verified, skip reporting/cleanup without blocking A1.

The guarantee covers cooperating A1 reporters for the same local Core context. The Core API cannot promise atomic ownership against an arbitrary noncooperating external writer of native keys; do not claim otherwise or fall back to unsafe read-then-write. If the target Core/context cannot support a shared verified fence, reporting fails closed. The implementation reserves in `bin/ui.js` immediately after fresh runtime UUID creation, before trust/engine startup. `~/.a1/herdr-bindings/` holds one monotonic generation journal per hashed canonical local terminal ID; reservation waits at most 250 ms for atomic directory-lock admission. Locks are never stolen based on age/PID. A crash or unverified child settlement can therefore disable later reporting until operator-verified residue recovery; this is an intentional safety trade-off, not automatic deletion authority.

### 7. Windows and Unix subprocess behavior is explicit

The subprocess port takes executable plus literal argument arrays and returns bounded structured results. Unix resolves a local supported `hc` executable from PATH. Windows must cover `.exe` and npm-installed command resolution using the repository's existing resolution patterns/dependency, without interpolating terminal IDs or labels into a shell string. Prefer the actual executable or Node plus resolved CLI script rather than treating an npm `.cmd` shim as a Unix executable. No credentials, terminal payload, full environment dump, or user session paths in diagnostics.

Use fake executables/Node CLI scripts in disposable fixtures for missing commands, nonzero exit, timeout, output overflow, Windows paths/spaces/shims, and Unix invocation. Cross-process fence races must be tested with two disposable reporters, not mocked only within one Promise chain.

### 8. Documentation and consumer boundary

Maintain public help/README/session-color documentation for exact discovery, startup palette/grammar, Default-versus-Current precedence, replacement policy, native labels and ownership, heartbeat/freshness, Core-only installation, and fail-safe compatibility. Herdr currently accepts bindings fresh within 90 seconds with five seconds of future-clock tolerance; these are consumer validation constants, not A1 permission to guess freshness or targets.

Native `a1.*` labels take precedence. Partial native identity fails closed and cannot borrow `custom.a1.*`; legacy fallback applies only when all three native keys are absent. A1 neither implements Herdr's matcher nor modifies companion references or custom wrappers.

Herdr supplies the latest space color only for its supported explicit A1 profile launch in an existing identified space with matching enabled and version-1/both-true capabilities. Custom wrappers, unrelated profiles, disabled matching, conflicting configured startup options, manually started A1, and new spaces retain the consumer's documented conservative behavior. A manual Core-hosted A1 gains identity and subsequent live matching, not a promised first-frame space handshake.

## Validation Strategy

Implement one PR outcome at a time, each with its matching code/tests and tasks group, then commit/push/tick that outcome before starting the next. Local checks stay focused; strict validation uses the pinned repository OpenSpec tool, not a newer globally installed CLI. Draft planning needs no product build or broad test run.

| Owner boundary | Deterministic coverage |
| --- | --- |
| CLI/color adapter | Exact discovery bytes/exit; intermediate false capability; no launch/trust/Core side effects; existing list/get/set shapes; valid/missing/invalid/duplicate color; option orders; `--` literal payload; unsupported/comparison/maintenance isolation. |
| Launch/release/shipped entries | Literal encoding/decoding; cold/warm/reselection/development child paths; incompatible retained child rejection; color/prompt never reaches Pi options; no tool/shell color environment leakage. |
| Startup/trust/composition | First emitted trust frame and first editor frame use override despite another saved Default; no override/global blue fallback; no project resource reads before trust; restricted/trust-exit startup handling. |
| Settings/session lifecycle | No durable color writes; successful new/resume/fork/import reset to invocation policy; failures/cancels preserve prior session/color; live API/Settings edits and Default changes do not change policy; no-override latest-Default behavior; peers unchanged. |
| Reporter/endpoint composition | Ready gating; exact history/runtime IDs; heartbeat cadence; replacement waits for endpoint publication; repeated replacements/coalescing; start failure; shutdown during publication; timer/subscription disposal. |
| Subprocess/ownership fixtures | Missing Core/command, invalid identities, bounded failures/overflow, literal Windows/Unix resolution, two-runtime heartbeat/replacement/disposal/late-start races, successor exit without stale reclaim, corrupt/partial/foreign labels, lock/process settlement failure. |
| Disposable integration | Core-only SSH-equivalent fixture without App/customizations/companion; native/legacy coexistence; freshness contract and older A1 discovery fallback. Actual remote/live validation is separately authorized, never required to tick written code/tests. |

Expected existing test homes include `test/cli/session-color.test.ts`, `test/features/launch`, `test/foundation/release/bootstrap-boundary.test.ts`, `test/ui/settings`, `test/features/owned-ui`, and `test/composition/session-colors.integration.test.ts`. Add fixtures under the owning test roots, not a user's runtime storage.

## Risks / Trade-offs

- Cross-process ownership is the principal safety risk. A supported labels read plus an unguarded write is insufficient; filesystem locking/fencing must include delayed/timed-out subprocesses and generation retention.
- A per-user/Core terminal fence must be shared even across profile selection and must not trust PID-only liveness as generation authority. Fail closed on an unverifiable namespace/path rather than weakening the guarantee.
- Warm/retained release selection can choose code different from the probing installation. Explicit compatibility guarding is necessary; silently dropping startup color is not an acceptable successful override.
- The canonical pre-resource spec still names legacy `accentColor`, although implementation and the newer settings spec already use `defaultAccentColor`. This change's delta corrects that requirement while adding invocation precedence, without restoring legacy initialization.
- The prompt boundary is a narrow new declared form; it must not erase the established silent-no-op command contract or allow arbitrary engine flags.
- Early generation reservation adds small Core-context-only coordination before visible startup. Keep it bounded and startup-safe, with no Core subprocess on the first-frame critical path.

## Implementation Disposition / Known Gaps

- Delivered all three planned outcomes in the original worktree/branch/PR. Capability discovery now advertises both delivered features; implementation tasks report written code/tests, not CI or maintainer acceptance.
- Resolved the absent external consumer-file prerequisite using the maintained disposable equivalent in `test/composition/fixtures/herdr-color-consumer.ts`. It codifies the supplied version-1 capability, native-over-legacy freshness, partial-native fail-closed, and older-discovery fallback contracts. No Herdr consumer code/configuration was modified. The claimed external deployed consumer has not been independently verified.
- Resolved Core command/context facts using the local supported `hc` 0.1.19 CLI help/schema/manual: local `HC_TERMINAL_ID` addresses, public get/label, labels-map result, and absence of conditional writes. Windows executable/npm behavior and cross-process endpoint/label ownership run in disposable fixtures, not existing agents.
- Resolved fencing and retention with early monotonic reservation, canonical per-user terminal keys independent of runtime roots, no age/PID lock stealing, exact public-binding checks, and permanent supersession after successor exit. Incompatible retained startup payloads are rejected using their certified owned parser entry rather than silently dropping color.
- Deferred optional live Herdr/Core/SSH and physical first-frame smoke: no authorization to inspect/control existing agents was inferred. Contract/subprocess fixtures and deterministic first-frame composition tests do not claim a live App/remote deployment or physical terminal certification. Native Unix executable tests are written but skipped on this Windows host; native Unix execution remains for CI or separately authorized isolated validation.
- Retained intentional safety limitation: crash/unsettled-subprocess lock residue disables reporting for that terminal until exact operator-verified recovery. Ordinary A1 remains usable and stale consumer identity expires; no automatic unsafe fence reset or external-writer CAS guarantee is claimed.

## Rollout / Rollback

Keep the same branch, worktree, and PR through implementation and review. No migration or remote configuration is needed. Deliver launch support first without claiming terminal reporting; then reporter support; then maintained docs. Trusted automation owns readiness/finalization after all implementation outcomes are complete. Maintainer integration remains a separate exact-candidate decision.

Older A1 installations continue ordinary launching because Herdr requires both discovered capabilities before passing the flag. Disabling matching stops consumer launch overrides without affecting manual A1. Reverting native reporting leaves labels to expire or exact-owner cleanup; never wipe foreign/legacy labels or persist a session color as rollback.
