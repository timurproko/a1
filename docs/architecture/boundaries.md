# Architecture boundaries

## One process per launch

Every interactive command uses this profile-neutral path:

```text
mutable a1 entry (bin/cli.js)
  -> runBootstrap selects the verified approved immutable release
  -> one directly attached child: node <release>/bin/ui.js [session arguments], stdio inherited
  -> owned Pi-backed composition, with A1 surfaces enabled only for bare a1
```

The launcher waits for the child and returns its exit code. When the child reports that the active release changed during startup, the launcher re-reads the release store once and starts the newer release. There is no supervisor, launch guardian, control store, control protocol, cohort coordination, or process containment: any number of `a1` and `a1 pi` processes run independently, and only the session writer guard coordinates them. Closing the terminal ends the attached child through the operating system, as upstream Pi behaves; tool subprocesses behave as they do in upstream Pi.

The launcher does not read terminal input, parse or relay output, render cells, or synthesize terminal responses. Its only terminal output after an unclean child exit is the bounded terminal reset and the armed exit notice. Both profiles use the same owned rendering and input pipeline. Bare `a1` exposes A1-owned surfaces; `a1 pi` withholds them and uses Pi's ordinary profile root.

The owned Pi-backed surface is one agent per terminal. It is not a terminal multiplexer and has no tabs, resident sessions, reattach, or A1-authoritative scrollback. Any multi-agent or composed-terminal feature needs its own approved change.

## Current module responsibilities

- `lifecycle` (`src/foundation/lifecycle`): product paths, session selection, launch-profile identifiers, and the repository-context helpers behind `a1 session worktrees` / `link-worktree` / `unlink-worktree`. Worktree claims are serialized by a `proper-lockfile` claim gate, and runtime liveness is `process.kill(pid, 0)`.
- `launch-context`: the neutral private environment contract a launcher passes to the release it starts.
- `session-writer-lock`: one writer per Pi session file through `proper-lockfile`. Lock directories live in one per-user directory, keyed by the session file's canonical identity so aliases contend for one lock; stale locks are reclaimed after a 10-second bound. Every writer route goes through it, which `check-session-writer-guard.mjs` enforces.
- release/update/bootstrap (`src/foundation/release`): package-derived immutable release identity, certified release manifests, durable update transactions, atomic activation, rollback, age-based retention, and the dependency-light command entry. Before certified fast-path reuse it checks every recorded product file is present; a missing or altered file is replaced only from the matching installed package when its size and digest reproduce the approved release, followed by full verification. Dependency layers keep their separate verification and repair policy.
- `startup`: startup trace phases and the startup budget evaluator.
- `terminal-cleanup`: bounded, idempotent emergency restoration, the exit notice, and fatal-exit diagnostics for an explicitly owned terminal. It does not inspect commands, relay terminal input/output, or emulate terminal state. The owned UI installs its fatal boundary before terminal activation; the launcher performs the same bounded reset and delivers the armed notice when the child exits uncleanly. Fatal records retain at most ten 16 KiB records with trusted classifications and code locations, never prompts, attachments, raw input, credentials, or arbitrary exception messages.
- `launch` (`src/features/launch`): resolves the effective profile home and the history-specific data root. Composition uses its public path resolver to select `~/.a1/data` for history unless `A1_DATA_DIR` is explicit; global release/runtime/cache paths stay unchanged.
- `prompt-history`: narrowly typed user-input retention in separate profile-owned databases under `~/.a1/data/history` (or `<A1_DATA_DIR>/history`), with bounded worker queues. It receives a resolved root rather than importing launch-feature internals; it never probes, imports, or deletes the former platform-default history. The editor's owned history state machine remains inside the Pi component boundary; the session UI only coordinates snapshots and classified submissions.
- `prompt-suggestions`: opt-in bounded diagnostic snapshots of neutral suggestion lifecycle metadata. Composition supplies an explicit local destination; this feature never imports Pi, generates suggestions, stores conversation text, or owns the editor. See [prompt suggestion diagnostics](prompt-suggestions.md).
- `pi-engine-adapter`, `pi-component-adapter`, and `pi-tui-runtime-adapter` (`src/integrations/pi`): isolate pinned Pi engine and presentation knowledge behind neutral contracts; product features do not import them directly. Inside the engine adapter, one process-level engine host owns what is process-wide (the HTTP dispatcher, the theme singletons, the one-time changelog and package-update announcements, the startup trace) and is the only place sessions are created, so every session id is unique per process.
- `session-shell` (`src/app/session-shell`): the application layer that composes the feature owners, the UI foundations, and the three Pi adapters into the interactive session; only composition imports it. Its render root assembles semantic document and dock rows, while its focused viewport controller owns follow state, pointer routing, selection, and interaction timers. Owned-app route lifecycle belongs to the neutral `ui-apps` owner and is only hosted by the session shell.

## Dependency direction

Terminal boundaries are application-agnostic. They may not select behavior from executable names, arguments, CLI-specific environment variables, or visible text. Production code may not import private Pi distribution APIs or use a Pi-specific terminal workaround.

The product has no native code and no PTY or terminal-emulator dependency: no module under `src/` may import `node-pty` or a terminal emulator or spawn a pseudoterminal. Reintroducing xterm state, custom input encoders, mode/query trackers, cadence-derived frame inference, or renderer/projection code requires an approved capability change and cannot become a second terminal authority. The published package is pure JavaScript.

`scripts/governance/check-architecture.mjs` enforces the structural parts of these boundaries. Cross-cutting rationale belongs here; implementation history belongs in Git and archived OpenSpec changes.

## Session shell composition

The session presenter (`src/app/session-shell/session-shell.ts`) coordinates; it does not own per-concern state. Each concern implements `SessionConcern` (`session-concern.ts`): it resets its own state in `onSessionReplaced` and releases it in `dispose`, and the presenter lists its concerns once, in reset order, in `#createConcerns`. New submission, routing, dialog, or login behavior goes into the concern that owns it, or a new concern added to that list. The render root (`session-shell-root.ts`) likewise picks one `ShellLayout` at construction and delegates transcript caching to `TranscriptDocument`, dock chrome to `DockChrome`, workflow output to `WorkflowOutput`, extension surfaces to `ExtensionSurface`, and the dock's input surface to `InputSurfaceSwitch`. The engine adapter serves the shell through the ports built in `src/integrations/pi/engine/ports.ts`, and the composition root delegates runtime claims and the startup release note to their own modules under `src/composition/`.

## Unit size ratchet

Module boundaries do not stop one class or function inside a module from absorbing every feature. The architecture gate therefore measures every production TypeScript class under `src/` (methods and fields) and every TypeScript function under `src/` (inclusive lines), excluding vendored sources. A unit with more than 20 methods, 15 fields, or 100 function lines must be recorded in `config/baselines/size-ratchet.json`, and its recorded counts can only shrink:

- A recorded count that grows fails the gate. Split the unit instead. If growth is truly unavoidable, raise the entry by hand in the same pull request and say why in its description, so the growth is reviewed rather than silent.
- An unrecorded unit over a threshold fails the gate; split it before it lands.
- A count that shrinks, or a unit that falls below every threshold, fails until `node scripts/governance/update-size-ratchet.mjs` lowers or removes the entry. That script never adds or raises an entry; `--check` reports without writing.

The measurement in `scripts/governance/size-ratchet-policy.mjs` masks strings, comments, and regular expressions and counts braces, so it needs no build; a file whose braces do not balance is reported rather than mismeasured. Keys are `<path>::<Class>`, `<path>::<Class>.<method>`, or `<path>::<Type>::<fn>`, so moving or renaming a unit means moving its entry.

## Multi-session limits of the pinned engine

The engine host removes A1's own obstacles to several Pi sessions in one process (session switch, fork, and resume replace the session in place), but three limits remain in the pinned Pi SDK and must be planned around, not discovered:

- The extension cache is keyed by one working directory and cleared on reload (`core/extensions/loader.js`), so sessions in different directories reload each other's extensions.
- `SettingsManager` writes under a lockfile but never re-reads the file, so a second in-memory copy goes stale after another session writes a setting (`core/settings-manager.js`). The host keeps the one process-wide effect, the HTTP dispatcher, consistent itself.
- `AgentSessionRuntime.dispose()` releases the session but not the model runtime or the resource loader it was created with (`core/agent-session-runtime.js`), so a session's services outlive it until the process ends.

Resource queues, retained state, evidence, logs, and diagnostics follow `docs/architecture/resource-and-data-policy.md`. Terminal content and authentication material are never persisted as diagnostics. Unknown data is potentially sensitive by default and must be rejected or redacted before persistence.

## The rules every surface follows

How A1 builds what a reader sees — deriving a vendor engine's data rather than
transcribing it, failing the build by name when a vendor change has not been
absorbed, keeping vendor knowledge behind the vendor boundary, composing screens
from shared components, showing state rather than narrating it, taking colour
from declared theme roles, and answering both dispatch and description from one
declaration — is stated once in the `owned-ux-architecture` capability rather
than restated per feature.
