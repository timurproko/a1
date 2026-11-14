# Pi-compatible normal A1 launch

The package ships `bin/pi-compatible.js` and a real shell executable named `pi` in `bin/pi-compatible/`. This is an opt-in **normal A1** entry for Firstmate's existing Pi adapter. It keeps A1's UI, features, history, authentication/settings profile, task-copy coordination and session writer guard. It does not use `a1 pi` comparison mode.

Only `a1` remains globally registered by npm. To opt in, prepend the installed package's absolute `bin/pi-compatible` directory to PATH in the **dedicated Firstmate launch shell**, before launching Firstmate's main session. Locate the package under the global npm package root, or use an explicitly selected packaged installation. Do not overwrite an existing Pi installation or use a shell alias: Firstmate pins a real executable using `type -P`. On Git Bash use the directory's POSIX spelling, not a drive-letter PATH element. Keep that PATH in worker-terminal launch environments too; resolving it in the main shell alone is not worker acceptance.

The shim starts the shipped Node entry, which uses A1's ordinary immutable-release/bootstrap/guardian path. It never invokes an independently installed vanilla Pi. A retained release without authenticated support for the new runtime payload is refused; options/instructions are never dropped to allow fallback.

## Product API parity

The compatible executable uses the same normal-product API identity and lifecycle
as ordinary A1, including session color control, native Herdr reporting and
session/worktree context. External clients use the existing public `a1` commands
for sessions started by either launcher. The compatible parser remains an
instruction grammar, not a second control CLI. API capability responses and
identity/expiry/acknowledgement protections are unchanged; comparison `a1 pi` and
noninteractive operations retain their intentional exclusions.

## Supported contract

- One positional instruction, or literal arguments after `--`, reaches the ordinary prompt path once after startup and first presentation. Quotes, Unicode, spaces and newlines are not shell-evaluated. The complete joined prompt must be NUL-free and at most 32768 UTF-8 bytes; oversized input fails rather than truncates.
- `--model` uses Pi's real catalog and qualified/fuzzy lookup, including supported thinking suffixes. Unknown synthetic model IDs are refused. `--provider` requires a model and constrains selection. Missing authentication fails without changing accounts or borrowing another profile.
- `--thinking` supports `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`, clamped by Pi to the selected model. Explicit effort wins over a model suffix. Startup overrides win over resumed state but do not rewrite saved defaults; later user model changes remain session-owned.
- Repeated `-e` / `--extension` loads explicit paths before startup hooks. Relative paths are anchored to the original launch directory. Extension long flags require actual loaded registrations, including any native-Codex effort extension. Put `--` before the prompt when using extension flags. Failed explicit extension imports/flags stop startup instead of silently omitting worker hooks.
- `--exclude-tools` applies Pi's comma-separated tool name/pattern denylist after selection, including extension tools.
- `--session` and `--session-dir` retain A1's writer-guarded selection/fork semantics; session storage can also be selected independently for a new session. `--session-color` retains A1's invocation-only accent behavior.
- `--help`, `--version` and `--list-models [search]` exit without interactive agent startup or an LLM call. Version reports the real A1 release and pinned Pi engine; it does not pretend to be another Pi version. Outside a Firstmate-scoped environment, catalog queries use the effective A1 profile and extension-provided models. Help/version do not load extension factories. Catalog discovery may load factories but never binds session startup hooks. **Catalog probes in a Firstmate-scoped environment currently fail closed before loading factories**, pending the external lifecycle correction below.

Display/trust/RPC/maintenance parity is not offered. In particular help does not advertise Pi's optional display-mode or invocation-trust flags, so Firstmate can omit them. Ordinary A1 trust resolution remains in force. Unknown short flags and unsupported modes fail; unavailable extension flags fail through the loaded registration contract.

## Identity and isolation

The new interactive UI host publishes `AI_AGENT=pi` and `PI_CODING_AGENT=true` before loading extensions. It clears inherited `FM_PI_SESSION_PID`, `FM_PI_SESSION_START` and parent shell session metadata only at this independent process boundary. In-process supervision sessions and ordinary helpers retain the established host identity. Pi's shell tools resolve current session/model/effort metadata on each command.

Firstmate's tracked primary extension owns native Windows PID/start publication and receipt cleanup. A1 does not forge its ownership files, impersonate Claude, or bypass that extension. Help probes do not load factories. Catalog probes refuse a Firstmate-scoped environment before loading factories; this is a temporary safety refusal, not completed Firstmate catalog compatibility. Do not manually remove the Firstmate environment selectors to bypass it while loading orchestration extensions. Attachment-aware A1 built-in tools continue to use the attached task copy; independent extensions/helpers keep their own cwd.

A1 waits for asynchronous extension startup before submitting the initial prompt or completing a replacement callback. Startup notices get a frame before prompt submission clears transient presentation. Repeated UI attachment does not replay session startup: bindings follow the active presenter, and Pi's own reload emits its single replacement startup. New/resume/fork await their fresh bindings before replacement-session work runs.

## Development and acceptance status

Build the checkout first, then use the supported `scripts/dev` launcher with `--pi-compatible` followed by compatibility arguments. This selects the same normal owned UI and preserves structured arguments while retaining the development launcher's isolated runtime state. It is not packaged release certification.

The current Firstmate primary extension writes `.pi-turnend-extension-loaded` from its factory, before `session_start`. A catalog-only load in disposable state reproduced marker replacement. Firstmate must move that live-session publication behind its session lifecycle before safe shared-state catalog loading can be accepted. This A1 change does not modify Firstmate. The refusal detects Firstmate home/root/state selectors or inherited native-host PID/start claims; their absence is not a sandbox for arbitrary side-effecting factories.

CI regression coverage exercises real A1 composition, the owned renderer/input bridge and actual embedded Pi sessions, with only model transport replaced by deterministic responses. It covers startup digest delivery, custom tools/renderers, notifications, blocking input, queued follow-ups, steering acknowledgements, current shell metadata, a second in-process SDK session, independently composed workers, durable notification delivery and new/resume/reload/fork lifecycle ordering. These contract fixtures are not a copy of Firstmate or proof of its deployment.

The maintainer will perform real Firstmate main/worker terminal testing after CI and use a corrective PR if needed. The known catalog refusal remains documented rather than modifying the read-only Firstmate prerequisite or claiming full live acceptance. Deterministic CLI, catalog, selected-release transport and real embedded SDK checks are separate from full Firstmate acceptance. Main/worker terminal resolution, native ownership, automatic completion, concurrent workers, steering, replacement and recovery must be established with named disposable Firstmate state. Do not use a user's active operational home or unrelated Herdr windows. Firstmate's current stream-observation probe accepts exactly Pi 1.2.0; truthful Pi 1.5.2 engine reporting leaves its conservative existing busy bound in effect rather than enabling that unverified optimization.
