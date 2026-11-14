# Default Pi-compatible A1 launch (P1, partial)

Ordinary `a1` and the optional Pi-named entry share the delivered Pi 1.5.2 grammar and normal A1 runtime. There is no compatibility mode. This is P1 of four approved deliveries, not a claim of full drop-in parity.

The package ships `bin/pi-compatible.js` and a real shell executable named `pi` in `bin/pi-compatible/`. This is an opt-in **normal A1** entry for Firstmate's existing Pi adapter. It keeps A1's UI, features, history, authentication/settings profile, task-copy coordination and session writer guard. It does not use `a1 pi` comparison mode.

Only `a1` remains globally registered by npm. To opt in, prepend the installed package's absolute `bin/pi-compatible` directory to PATH in the **dedicated Firstmate launch shell**, before launching Firstmate's main session. Locate the package under the global npm package root, or use an explicitly selected packaged installation. Do not overwrite an existing Pi installation or use a shell alias: Firstmate pins a real executable using `type -P`. On Git Bash use the directory's POSIX spelling, not a drive-letter PATH element. Keep that PATH in worker-terminal launch environments too; resolving it in the main shell alone is not worker acceptance.

The shim starts the shipped Node entry, which uses A1's ordinary immutable-release/bootstrap/guardian path. It never invokes an independently installed vanilla Pi. A retained release without authenticated support for the new runtime payload is refused; options/instructions are never dropped to allow fallback.

## Product API parity

The compatible executable uses the same normal-product API identity and lifecycle
as ordinary A1, including session color control, native Herdr reporting and
session/worktree context. External clients use the existing public `a1` commands
for sessions started by either launcher. Both names use the shared execution parser.
Leading recognized control words remain commands; `--` makes them literal prompts.
For example, leading `update` updates A1 and its certified embedded Pi, while
`-- update` submits an instruction. Neither name independently upgrades Pi. API capability responses and
identity/expiry/acknowledgement protections are unchanged; comparison `a1 pi` and
noninteractive operations retain their intentional exclusions.

## Supported contract

- Bare positional messages execute in order, once each, after startup and first presentation. `--` stops option/control interpretation. Quotes, Unicode, spaces and newlines are not shell-evaluated. The current argv transport remains NUL-free and bounded to 32768 UTF-8 bytes; larger input, files/images and stdin transport belong to P3 and fail explicitly for now.
- `--model` uses Pi's real catalog and qualified/fuzzy lookup, including supported thinking suffixes. Unknown synthetic model IDs are refused. `--provider` requires a model and constrains selection. Missing authentication fails without changing accounts or borrowing another profile.
- `--thinking` supports `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`, clamped by Pi to the selected model. Explicit effort wins over a model suffix. Startup overrides win over resumed state but do not rewrite saved defaults; later user model changes remain session-owned.
- Repeated `-e` / `--extension` loads explicit paths before startup hooks. Relative paths are anchored to the original launch directory. Extension long flags require actual loaded registrations, including any native-Codex effort extension. Put `--` before the prompt when using extension flags. Failed explicit extension imports/flags stop startup instead of silently omitting worker hooks.
- `--exclude-tools` applies Pi's comma-separated tool name/pattern denylist after selection, including extension tools.
- `--models` replaces saved cycling patterns for this invocation. `--api-key` requires a selected `--model` or `--models` scope and overrides credentials only for that provider, without changing saved accounts/defaults. Keys are not written into release evidence or development inspection output. Explicit model/effort choices override resumed state; later UI choices are not reset by replacement.
- `-c` / `--continue` opens the latest local session or creates one; `-r` / `--resume` uses an owned pre-resource picker and refuses headless guessing. `--session` keeps local exact/prefix lookup, cross-project fork decisions and missing-cwd recovery. Persistent sessions retain canonical writer admission before activation.
- `--fork <path|id>` copies history into the launch cwd with a new identity; optional `--session-id` chooses that new ID. Without a fork, an exact local ID reopens or creates a session. Conflicting selectors are rejected; concurrent custom-ID creation cannot produce two writers. `-n` / `--name` supplies a trimmed nonempty display name.
- `--session-dir` overrides environment storage, trusted settings and the SDK default. Relative paths are resolved before switching cwd. Unlike Pi's pre-trust project-setting exception, A1 withholds an untrusted project's `sessionDir`; a saved/default/invocation trust grant is needed to use it. Global settings remain available. Trust for resource loading is resolved again for the selected effective cwd.
- `--no-session` uses the actual in-memory manager, with no transcript file, writer or resume hint. Ordinary tools use its explicit cwd. Durable worktree operations report a storage-capability error; automatic repository-context naming and file-backed editor history are withheld. HTML export refuses memory sessions; an explicitly requested JSONL branch export does not make the running session persistent.
- `-a` / `--approve` and `-na` / `--no-approve` override project trust for this process, ahead of global/CLI extension decisions, saved decisions and defaults. Global/explicit extension factories load only as the trusted bootstrap set; project factories load only after admission. Trust hooks can use pre-resource dialogs when a real terminal exists; headless contexts advertise no UI. Failed trust handlers fail closed without echoing their error payload. Only an extension's explicit `remember: true` persists its decision.
- `--session-color` retains A1's invocation-only accent behavior.
- `--help`, `--version` and `--list-models [search]` exit without interactive agent startup or an LLM call. Version reports the real A1 release and pinned Pi engine; it does not pretend to be another Pi version. Outside a Firstmate-scoped environment, catalog queries use the effective A1 profile and extension-provided models. Help/version do not load extension factories. Catalog discovery may load factories but never binds session startup hooks. **Catalog probes in a Firstmate-scoped environment currently fail closed before loading factories**, pending the external lifecycle correction below.

P2 tools/resources/maintenance, P3 print/JSON/RPC/programmatic and input transports, and P4 complete extension/UI/platform conformance remain pending, not permanent exclusions. Display-mode flags and undelivered transports fail usefully; they never select another runtime. A1 keeps factory-free help, truthful product identity, profile isolation, catalog-bound models, strict diagnostics, trust/writer protections and its own UI. These named safety/product differences and the external catalog blocker mean P1 is not full Pi parity.

## Identity and isolation

The new interactive UI host publishes `AI_AGENT=pi` and `PI_CODING_AGENT=true` before loading extensions. It clears inherited `FM_PI_SESSION_PID`, `FM_PI_SESSION_START` and parent shell session metadata only at this independent process boundary. In-process supervision sessions and ordinary helpers retain the established host identity. Pi's shell tools resolve current session/model/effort metadata on each command.

Firstmate's tracked primary extension owns native Windows PID/start publication and receipt cleanup. A1 does not forge its ownership files, impersonate Claude, or bypass that extension. Help probes do not load factories. Catalog probes refuse a Firstmate-scoped environment before loading factories; this is a temporary safety refusal, not completed Firstmate catalog compatibility. Do not manually remove the Firstmate environment selectors to bypass it while loading orchestration extensions. Attachment-aware A1 built-in tools continue to use the attached task copy; independent extensions/helpers keep their own cwd.

A1 waits for asynchronous extension startup before submitting the initial prompt or completing a replacement callback. Startup notices get a frame before prompt submission clears transient presentation. Repeated UI attachment does not replay session startup: bindings follow the active presenter, and Pi's own reload emits its single replacement startup. New/resume/fork await their fresh bindings before replacement-session work runs.

## Development and acceptance status

Build the checkout first, then use the supported `scripts/dev` launcher with ordinary arguments, or `--pi-compatible` for the optional naming adapter. This selects the same normal owned UI and preserves structured arguments while retaining the development launcher's isolated runtime state. It is not packaged release certification.

The current Firstmate primary extension writes `.pi-turnend-extension-loaded` from its factory, before `session_start`. A catalog-only load in disposable state reproduced marker replacement. Firstmate must move that live-session publication behind its session lifecycle before safe shared-state catalog loading can be accepted. This A1 change does not modify Firstmate. The refusal detects Firstmate home/root/state selectors or inherited native-host PID/start claims; their absence is not a sandbox for arbitrary side-effecting factories.

CI regression coverage exercises real A1 composition, the owned renderer/input bridge and actual embedded Pi sessions, with only model transport replaced by deterministic responses. It covers startup digest delivery, custom tools/renderers, notifications, blocking input, queued follow-ups, steering acknowledgements, current shell metadata, a second in-process SDK session, independently composed workers, durable notification delivery and new/resume/reload/fork lifecycle ordering. These contract fixtures are not a copy of Firstmate or proof of its deployment.

The maintainer will perform real Firstmate main/worker terminal testing after CI and use a corrective PR if needed. The known catalog refusal remains documented rather than modifying the read-only Firstmate prerequisite or claiming full live acceptance. Deterministic CLI, catalog, selected-release transport and real embedded SDK checks are separate from full Firstmate acceptance. Main/worker terminal resolution, native ownership, automatic completion, concurrent workers, steering, replacement and recovery must be established with named disposable Firstmate state. Do not use a user's active operational home or unrelated Herdr windows. Firstmate's current stream-observation probe accepts exactly Pi 1.2.0; truthful Pi 1.5.2 engine reporting leaves its conservative existing busy bound in effect rather than enabling that unverified optimization.
