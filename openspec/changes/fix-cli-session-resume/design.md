## Context

See `proposal.md` for motivation and scope. Read-only investigation against installed A1 `0.1.8-dev.226` and pinned Pi `0.84.2` established:

- `src/cli/dispatch.ts` maps `--session <id>` to `noop`; a direct dispatcher probe returned code 0, no handler calls, and no output.
- `InteractiveLaunchIntent` and bootstrap accept only a profile. The launch guardian spawns Node with only the UI entry, losing any prospective session arguments.
- `bin/ui.js` has a narrow, currently unreachable public-path parser for `--session <session-file>`.
- `createPiRuntimeIntegration()` calls `SessionManager.open(options.sessionPath, sessionDir, options.cwd)`: it neither resolves IDs nor allows the header cwd to determine initial services.
- `formatSessionResumeCommand()` prints an ID, optionally preceded by `--session-dir`. Current tests assert the string without dispatching it through the installed launcher.
- Pi's CLI `resolveSessionPath()` separates paths from IDs, lists local then global sessions, and prompts before forking a globally matched ID into the current project. ID resolution is CLI policy, not behavior of `SessionManager.open()`. The latter can prepare a new session at a nonexistent explicit path.
- Investigation also found a documentation/runtime mismatch for synthetic `retainedTail` checkpoints. That is an upstream capability gap, not a demonstrated failure to resume sessions written by this Pi pin. The user clarified that recovery of their current conversation is not requested; acceptance concerns future create/exit/resume use.

Design is required because CLI grammar, immutable launch transport, Pi startup, trust/cwd binding, and integration evidence all participate.

## Goals / Non-Goals

**Goals:**
- One explicit selection contract from public CLI to the existing owned composition, with no profile-global resume state.
- Public Pi API reuse for session listing/opening/forking and context reconstruction; A1 owns only the missing CLI policy and transport.
- A session selection failure must not masquerade as a successful launch or create an unintended conversation.
- Regression evidence must detect each originally disconnected boundary and prove a newly persisted session resumes with the same context the pinned Pi restores directly.

**Non-Goals:**
- Importing Pi's CLI main module, delegating rendering to Pi's CLI, or upgrading Pi.
- Reimplementing the JSONL tree, compaction, model restoration, or project trust engines.
- Redesigning `/resume`, session selectors, or the comparison profile's CLI/hints.
- New locking semantics for simultaneous writers to the same saved session; independent launch tests use distinct sessions.
- General CLI compatibility or a new automatic-resume default. See the proposal's excluded aliases.
- Recovery/modification of the user's current conversation, forward-format support beyond the pin, or an A1 retained-tail reconstruction/rejection subsystem. Existing compatible saved sessions remain selectable; they are not rejected merely because they predate the fix.

### Approved scope clarification

The user's approval narrows restoration acceptance to the shipped Pi's actual behavior for sessions created through that same version. It supersedes the previous requirement to pass an unsupported synthetic retained-tail fixture before shipping the CLI repair. `certify-pi-retained-tail-compatibility` is deferred independent work, not a dependency of this change. Its finding remains valid, but neither an upstream fix nor a Pi upgrade is needed to implement this scope. Do not claim this clarification fixes or certifies the unsupported format.

## Decisions

### 1. Parse a bounded normal-A1 session grammar

Recognize the two top-level options as an A1 interactive launch grammar. Carry a typed optional session selection containing the raw target and optional explicit storage directory. Reject malformed recognized forms before loading launch infrastructure. Keep fresh launch, help/version/package/update dispatch, and unrelated unsupported grammar unchanged. Update help and share validation with internal entry decoding so accepting an option at one boundary cannot silently lose it at another.

Do not forward arbitrary argv into Pi. A generic passthrough could accidentally enable print/RPC/package modes inside the owned UI or reinterpret maintenance commands. Do not expose picker/continue aliases in this repair: the concrete failure and acceptance target are the command A1 already prints.

### 2. Transport selection without invoking a shell

Thread selection through `InteractiveLaunchIntent`, bootstrap, the guardian entry, guardian options, and contained UI argv. Keep target and directory as separate argument values, never a shell-joined command. Preserve the invoking cwd for relative-path interpretation. Audit retry/handoff and development-launch paths for the same metadata contract; the supported color-preserving development launcher must be able to exercise the new grammar.

No session target belongs in shared supervisor defaults, release certification, or persistent cohort state. Do not infer it from inherited `PI_SESSION_ID`/`PI_SESSION_FILE`. If an existing handoff mechanism needs serialization, validate the same bounded selection at its receiver and preserve invocation identity. The lifecycle layer transports metadata but never reads conversation contents or terminal traffic.

Passing only a resolved filename from the outer launcher was considered, but would force profile-aware Pi discovery into the dependency-light bootstrap and complicate interactive cross-project confirmation. Resolution belongs in the owned runtime's startup integration after profile environment selection.

### 3. Implement the missing resolver at the Pi integration boundary

Use public `SessionManager.list`, `listAll`, `open`, and `forkFrom` with the installed pin. Read the pinned CLI source as the behavioral oracle, not as an importable internal API. Consult Pi's SDK/session-format documentation and `examples/sdk/11-sessions.ts`; existing integration boundary restrictions continue to apply.

Resolution order:

1. Freeze effective directory precedence: explicit option, then `PI_CODING_AGENT_SESSION_DIR`, then the normal A1 default. Resolve relative explicit paths/directories against the invoking cwd before any effective cwd switch.
2. Classify a target containing `/`, `\\`, or ending in `.jsonl` as an explicit file path; otherwise treat it as an ID selector.
3. For IDs, search local listing exact match before prefix; only on local miss search the global listing exact match before prefix. Retain pinned listing-order selection for ambiguous prefixes. Default global lookup remains inside the A1 profile, never `~/.pi/agent`.
4. On cross-project ID match, identify the source project and request pinned-style confirmation to fork into the invoking cwd. Confirmation occurs before resource execution or fullscreen conversation startup. Decline/cancel reports cancellation, writes no fork, and exits cleanly.
5. Open a local/file match directly. An explicit foreign-project path uses its header cwd; a confirmed global-ID fork uses the invoking cwd and a new identity. Explicit paths/directories are authorized storage choices, not automatic profile merging.

A1 deliberately narrows Pi's explicit-path creation behavior for this resume command: a missing or empty file is an error, not an instruction to create a session. Preflight regular/readable/nonempty target metadata before calling `open`; recheck failures at the opening boundary and do not silently fall back. Delegate session-format acceptance to Pi rather than maintain a second JSONL parser. The existing-file opening behavior must be covered by public-boundary tests, including deletion between lookup and opening where a test seam permits it.

### 4. Resolve effective cwd before constructing services

Do not unconditionally pass `options.cwd` as `SessionManager.open`'s override for an existing file. Derive the initial runtime cwd from the opened manager; use that cwd to resolve trust, resources, tools, and model services. Explicit missing-cwd targets fail before project resource execution rather than silently adopting the launching directory. This is separate from the existing in-UI `/resume` recovery prompt, which is not changed.

Pass the opened/forked manager into `createAgentSessionRuntime` and the existing runtime factory. Pi remains responsible for active-branch context, the compaction formats it actually writes and restores, saved model/thinking restoration, and normal unavailable-model fallback. A1 must introduce no additional context loss relative to direct reopening through the same pin. Unsupported synthetic retained-tail restoration is not this change's acceptance gate. The shell must render the restored snapshot before input is accepted; resume never submits a model prompt by itself.

Opening a session under current cwd to avoid trust questions was rejected: it would restore the conversation but silently attach its tools and resources to a different project.

### 5. Define user-visible failure and exit behavior

Syntax failures exit nonzero before supervisor startup with one focused usage diagnostic. Resolution/open/cwd failures terminate the contained startup with a concise diagnostic propagated to the invoking shell and normal instance cleanup. A cancelled cross-project fork exits successfully with explicit cancellation output. Unexpected failures retain technical diagnostics through existing error facilities, but a raw stack trace is not the primary expected-invalid-target message.

The advertised command continues to use compact IDs and existing dim-prefix styling. Its formatter must be backed by public grammar tests and full round-trip evidence. Suppress claims of resumability when no session was persisted. Do not replace the hint with a private `bin/ui.js` launch, raw default file path, or instruction to use `/resume`; those would evade the reported defect.

### 6. Validate behavior at connected boundaries

Use isolated fixture profiles, existing test harnesses, and disposable sessions newly persisted through the pinned public session APIs, with recognizable conversation markers, saved model/thinking state, and compaction checkpoints in the format that pin writes. Generate compacted fixtures through its public persistence API with a synthetic summary and valid retained-entry references, not a live summarization/model call. Include both uncompacted and compacted sessions. Record the exact Pi version and compare A1's reopened context to direct public-API reopening under the same pin, with independent marker/order and identity assertions so an empty context cannot pass merely by matching another empty result. No personal data, actual model request, or live user supervisor is required.

| Boundary | Required evidence |
| --- | --- |
| CLI | Both option orders; help; malformed options; bare launch; unaffected maintenance and unsupported words |
| Transport | Same target/directory through bootstrap, guardian entry and contained argv; retry/handoff; Windows spaces/apostrophes; distinct concurrent invocations; no inherited stale selection |
| Pi resolution | Path classification, relative paths, local exact/prefix precedence, global confirmation/fork/cancel, ambiguous pinned ordering, custom/env/default directories, profile isolation |
| Restoration | Newly written same-pin uncompacted and compacted sessions; same ID/file for direct resume; fork gets new identity and preserves source; active context matches direct Pi reopening and independent marker/order expectations; saved model/thinking fallback; effective cwd and trust ordering |
| Failure | Unknown ID; missing/empty/unreadable/invalid file; missing cwd; no accidental ID-named file or empty replacement; shell exit status and cleanup |
| End to end | Create/persist a fresh disposable session with the pin, exit normal A1 to obtain its hint, execute it via the packaged public entry and real production launch transport, observe restored UI/session state, exit cleanly; default and custom storage |

Keep fast parser/transport tests distinct from resource-sensitive exact-package evidence. A packaged-entry test must not replace the launch handler with a successful stub, bypass bootstrap with `bin/ui.js`, or stop at command formatting. Use controlled offline runtime resources/fixtures within the existing harness to avoid model calls while retaining actual session loading. Windows Git Bash evidence verifies user-shell quoting separately from A1's shell-free internal argv forwarding.

## Risks / Trade-offs

- [Pi CLI policy is not a public resolver API] -> Keep A1's adapter small, name the pinned source/version in fixtures, and assert public behavior rather than import internals.
- [An apparently small parser fix can still lose metadata later] -> Require production launch-chain evidence in addition to unit tests.
- [Pi permits new explicit-path sessions] -> Guard resume targets, test negative cases and races, and never treat an unresolved ID as a filename.
- [Cross-project restore changes effective resource roots] -> Select cwd before trust/services and test an untrusted project without executing its resources early.
- [Prefix selection can be surprising] -> Preserve the pin's ordering for compatibility; emitted hints use full session IDs and therefore avoid ordinary prefix ambiguity.
- [Long compacted sessions expose rendering/restoration regressions] -> Include same-pin compacted fixtures and inspect identity/context, not only whether the UI opened.
- [Documentation promises a format the pin does not implement] -> Bound this repair to verified same-pin behavior; preserve the separate retained-tail finding without treating it as proof about the user's session or a prerequisite for ordinary resume.
- [Comparison-profile hints remain outside this repair] -> Make that scope explicit; do not claim general A1/Pi CLI parity from normal-profile evidence.
- [Cold-start/guardian changes may land concurrently] -> Rebase the subsequent implementation onto accepted integration state and rerun metadata-transport coverage without changing release ownership semantics.

## Migration Plan

The change adds supported public grammar without changing saved-session formats or profile layouts. Existing persisted sessions need no copying or migration. Release the implementation through normal A1 publication only after its required gates and user acceptance; the specification itself is not a runnable fix.

Rollback is a normal ownership-safe A1 version replacement. Existing session files remain readable by the prior pin, but the old public resume command remains broken; in-UI `/resume` remains the fallback. Do not delete session data or create a compatibility migration during rollback.
