# Design

The product design, decisions, and roadmap live in [`docs/architecture/resident-tabs.md`](../../../docs/architecture/resident-tabs.md). This document covers only what milestone 5 builds on top of milestones 1–4 and how it is proven. References in the form "architecture Decision N" point to that document; numbered headings below are this change's own decisions.

## Context

After milestone 4, bare `a1` with `residentTabs=true` runs the native attach client, resident server, and one holder per tab on Windows x64, macOS, and Linux. Tabs survive terminal closure, fail independently, and restart into their sessions. Milestone 2 added a minimal authenticated bridge (credentials, session file, process-level status, detach request) and a basic strip. Milestone 1 proved the controller-transfer barrier in the sans-IO core but no product path uses it yet.

Relevant current code:

- Engine events: `src/integrations/pi/engine/session-events.ts` (`PiSessionEvents`: `agent_start`, `tool_execution_start/end`, `agent_end`, `compaction_start`), `stopReason` in `src/integrations/pi/engine/adapter.ts`, and owned events in `src/contracts/owned-ui/model.ts` (`agent-run-started`, `agent-run-settled`, `dialog`).
- Pending requests: `src/integrations/pi/components/shell-extension-ui.ts` (`createPiExtensionUiBridge`), `src/integrations/pi/engine/extension-ui-binding.ts`, and trust in `src/integrations/pi/engine/project-trust-preflight.ts` and `src/features/owned-ui/project-trust-dialog.ts`. A1 has no separate tool-permission prompt today; permission requests made by extensions arrive through the extension UI binding.
- Commands: `src/integrations/pi/engine/workflow-runner.ts` (`case "name"`, `"quit"`, `"hotkeys"`, `"fork"`, `"resume"`), names in `src/contracts/owned-ui/session-workflows.ts`, autocomplete in `src/integrations/pi/components/shell-editor-autocomplete.ts`.
- Quit chord: `clearOrExit()` in `src/app/session-shell/session-shell.ts` uses a literal 500 ms interval; empty-editor `Ctrl+D` is `onCtrlD` in `src/integrations/pi/components/upstream/components/owned-editor.ts`.
- Shortcuts: `src/ui/components/shortcuts.ts` (`ShortcutRegistry`, `assertNoShortcutConflicts`), `KeybindingsManager` in `src/integrations/pi/components/upstream/adjacent/core/keybindings.ts` (loads `<agentDir>/keybindings.json`), `/hotkeys` in `src/integrations/pi/components/shell-presenters-info.ts`.
- Settings: `src/ui/settings/declarations.ts` (`OWNED_SETTING_DECLARATIONS`, `OWNED_UI_SETTINGS_VERSION`), `src/ui/settings/migrations.ts`, the screen in `src/features/owned-ui/settings-app.ts`.
- Theme: `piTheme()` tokens in `src/integrations/pi/components/upstream/theme/theme.ts`.
- Animation: `StatusIndicator` in `src/integrations/pi/components/upstream/components/status-indicator.ts`, `src/integrations/pi/components/shell-footer-status.ts`.
- Width: `displayWidth` and `truncateToWidth` in `src/ui/components/text.ts` (Node), and nothing yet in `native/terminal-host`.
- Latency budgets: `docs/architecture/terminal-host-proof-gate.md` (input-to-process p95 ≤ 16 ms, output-to-present p95 ≤ 33 ms) and `src/foundation/startup/startup-budget.ts`.

## Goals / Non-Goals

**Goals:**

- The complete foreground UX of architecture Decision 11 on all three platforms, with status from engine events only (architecture Decision 7).
- Two attached clients that can never misattribute input or a client-scoped command.
- Auto-naming, prewarm, and idle suspension with the recorded defaults, after the core UX passes its tests.
- Measured performance per platform against declared budgets.

**Non-Goals:**

- Packaging, release retention, `a1 tabs` commands including `a1 tabs host status`, and preview certification (milestone 6).
- Reboot restore, split layouts, CLI tabs, image-protocol forwarding.
- Any bell, sound, or notification setting.

## Decisions

### 1. The complete bridge supersedes milestone 2's minimal bridge

The `resident-terminal-host` requirement "The tab bridge reports structured A1 state and controller identity" in this change supersedes the minimal bridge requirement milestone 2 added. Implementation removes or merges that requirement in this change's delta (task 1.2), so one bridge requirement remains canonical. All new messages are additive within protocol generation 1 (optional fields, `unknown` fallbacks, new fixtures and digest), so a milestone-4 server or child still interoperates with features disabled per method.

Messages added or completed:

- child → server: `bridge.status{incarnation, seq, state, pendingRequests, queuedInput, stopReason?}`, `bridge.heartbeat{incarnation, seq}` every 5 s from the Node event loop, `bridge.session{file, name, nameSource}`, `bridge.prompt{interrupted}`, `bridge.request{action, originClientId, originControllerRevision, args}`.
- server → child: `bridge.visibility{visible}`, `bridge.rename{name, nameSource}`, `bridge.stop{deadlineMs}`, `bridge.tabs{snapshot}` (names, statuses, cwds only, for `/tabs`), and `bridge.requestResult{requestId, outcome}`.

If milestone 3 already added `bridge.heartbeat` for liveness supervision, this milestone reuses it unchanged.

The bridge client is a new module `src/features/resident-tab/bridge.ts` (new file) with a pure status deriver `src/features/resident-tab/status-deriver.ts` (new file), wired in `src/composition/owned-ui.ts` only when `--tab` is present. Rejected: deriving status in the native holder from screen content (architecture Decision 7 forbids it); deriving it in the server from raw engine events forwarded verbatim (larger bridge, content leakage risk).

### 2. Status state machine lives in the server's sans-IO core

The child reports facts (working, pending request count, queued input, last `stopReason`, settled). The server core maps them to the architecture Decision 7 states with priority `failed/crashed/restarting` > `needs-input` > `working` > `starting/restoring` > `error` > `done-unseen` > `suspended` > `idle`. `done-unseen` is `attentionSeq > seenSeq`: a working→settled transition increments `attentionSeq` when no client views the tab; any client viewing it sets `seenSeq = attentionSeq` and fans the change out to every client. `attentionSeq` and `seenSeq` are persisted with coalescing (at most one registry write per tab per second); volatile status is never persisted (architecture Decision 8). Reports with a superseded incarnation or non-increasing `seq` are dropped. A tab whose bridge is down or whose credential failed shows only process-level states. Rejected: computing status in each attach client (clients would disagree on `seen`).

### 3. The strip is drawn natively with Unicode grapheme widths

The attach client (`native/terminal-host`, new module `src/attach/strip.rs`) lays out chips: space, optional glyph and space, name, space, at most 20 columns. Names are segmented with `unicode-segmentation` and measured with `unicode-width`, matched to libghostty-vt's grapheme-width mode so the strip and surface agree; clipping appends `…` at a grapheme boundary. Layout always reserves `+`; when chips overflow, the viewed chip stays visible and the rest collapse into a `…` chip whose menu is drawn as an overlay below row 0 (arrow keys, `Enter`, `Esc`; viewed tab marked). With zero tabs, row 0 shows only `+`, and the surface area shows the hint `Alt+A new tab · Ctrl+C Ctrl+C leave`. Progress frames are shared across chips and driven by one client timer at 8 fps, only while any visible chip is working. Rejected: drawing the strip in Node (Node never touches terminal bytes, architecture Decision 2); computing widths with UTF-16 length (v2's bug).

### 4. Theme roles are resolved by Node at launch

Before starting the attach client, the launch path resolves the effective A1 theme with `piTheme()` and passes a small role table (viewed, hovered, other, warning, success, error, dim, accent, as 24-bit or indexed colors) to the client as a launch argument file under the owner-only runtime directory. A theme change takes effect on the next attach. Rejected: live theme sync through the server (no clear benefit for the preview).

### 5. Shortcuts are declared in Node and matched natively

Tab actions are declared in a new `src/features/resident-tab/shortcuts.ts` with ids `tabs.new`, `tabs.close`, `tabs.retry`, `tabs.fresh`, `tabs.rename`, `tabs.jump1`…`tabs.jump10`, `tabs.next`, `tabs.previous`, `tabs.moveRight`, `tabs.moveLeft` and the architecture Decision 11 defaults. User overrides come from the existing `keybindings.json` loaded by `KeybindingsManager`. At launch, Node assembles them against the owned `ShortcutRegistry` and Pi keybindings; a conflicting tab binding is disabled and reported once in the strip, never dispatched ambiguously. The effective table is passed to the attach client with the theme file, and inside tabs `/hotkeys` gains a Tabs section from the same table (so listing and dispatch cannot diverge). The client matches decoded key events (crossterm, kitty protocol where available, legacy `ESC`-prefixed Alt otherwise) before libghostty-vt encoding; unmatched keys go to the tab.

Milestone 4's failed-tab banner (`[r] retry · [f] start fresh · [alt+w] close`) and its banner-local `Alt+W` handling are absorbed into this table: `tabs.retry` and `tabs.fresh` are declared actions bound to `r` and `f` only in the failed-banner scope (a disjoint scope, so they never shadow typing in a live tab), `tabs.close` is the same global close action, and the banner text is rendered from the effective bindings so a rebinding changes the hint. Milestone 4's stall-notice `/restart-tab` joins the tab command set of design Decision 8.

The detach chord is fixed, not rebindable (user decision): the first `Ctrl+C` is forwarded unchanged and arms a timer equal to A1's clear/exit interval, which this change extracts from the literal in `clearOrExit()` into a named exported constant and passes to the client; a second `Ctrl+C` inside it is consumed as a local detach. A `Ctrl+C` that the client consumes to clear a host-owned selection does not arm the chord.

### 6. Mouse on row 0

The client enables SGR mouse with motion reporting on the outer terminal so it can show hover and drag. Row 0 events are never forwarded. Left click views; right click opens a `Rename`/`Close` overlay menu; a press held 250 ms or moved one column starts a drag that shows a `│` drop marker and commits `tab.reorder{expectedRevision}` on release. Rows below row 0 are offset by one and forwarded only if the child requested that mouse mode; otherwise host-owned selection applies as in the proof.

### 7. Rename, names, and auto-naming

`F2` or the menu opens an inline chip editor in the client (grapheme-aware cursor, `Enter`, `Esc`, click elsewhere). Validation (trim, strip controls, nonempty, ≤ 64 characters) runs in the client for feedback and again in the server core, which commits `tab.rename{expectedRevision}` with `nameSource=user` and sends `bridge.rename` so the child calls `setSessionName`. `/name` in a tab calls `setSessionName` as today and reports `bridge.session{name, nameSource:"user"}`. Default names are `agent` or `agent N` (smallest free N), assigned by the server core.

Auto-naming (`src/features/resident-tab/auto-name.ts`, new file) runs in the child after the first settled turn when `tabsAutoName` is on and the server's `nameSource` is `default`. It asks the tab's current model for a name with a 64-output-token budget and a 10 s timeout, retries once, normalizes to lowercase `[a-z0-9-]`, collapses hyphens, and truncates to 16 characters at a hyphen when possible. On failure it derives the name deterministically from the first prompt's first words with the same normalization. It reports `nameSource:"auto"`; the server rejects an auto name when the current source is `user`, so a concurrent rename always wins. Auto-naming never blocks or delays the turn. Rejected: naming in the server (it runs no Pi code).

### 8. Close, quit-all, and graceful stop

`Alt+W` (including on a failed tab's banner), the menu, and `/close` all reach `tab.close`; a failed, crashed, or suspended tab is never busy, so it closes without confirmation. `/restart-tab`, kept from milestone 4's stall notice, is a tab command with the same origin stamping as the others: it asks for confirmation when the tab is busy and then restarts the tab from its session through milestone 4's restart path. If the tab's status is `working` or `needs-input`, or the bridge reports queued input, the origin client replaces row 0 with `Stop "<name>"? Enter stop · Esc cancel`. Stop sets `desired=stopped` (so the crash restart path does not fire), sends `bridge.stop{deadlineMs: 5000}` (the child runs its bounded quit from #732, synchronizes the session, and exits), then has the holder terminate the verified tree after the deadline. Without a bridge, the holder sends the platform's graceful signal first (`SIGHUP` to the PTY session on macOS/Linux, ConPTY close then `CTRL_CLOSE_EVENT` on Windows). `/quit-all` sends `tabs.stopAll`, confirming once if any tab is busy, then detaches the origin client with the ordinary resume hint. Closing the last tab leaves the empty state.

### 9. Two clients, one controller

Each client has its own viewed tab (server-side per client). Each tab has at most one controller, transferred through the milestone-1 barrier (`tab.claimInput{expectedControllerRevision}`). A client viewing a tab with no controller claims it on its first input event; that event is held in the client (bounded) and delivered after the acknowledgement. A client viewing a tab another client controls is read-only: row 0 shows `view only · Enter take control` at the right edge; `Enter` issues the claim and is consumed; other input is not forwarded. A client that detaches or disconnects releases its controllers. Resize follows the controller.

Client-scoped commands typed in a tab (`/quit`, empty-editor `Ctrl+D`, `/new-tab`, `/tabs` selection, `/close`, `/restart-tab`, `/quit-all`) are stamped by the child with the controller identity and revision the child observed at command admission, which the barrier makes causal. The server applies them only if that revision is still current; otherwise it rejects them, the child shows `This terminal no longer controls the tab · press Ctrl+C twice to leave`, and nothing else happens. If the platform's barrier is disabled (milestone 1 allows that), the tab keeps a single controller, transfer is refused with a notice, and client-scoped commands work only for that controller.

On detach the client restores the outer terminal (milestone 2 path) and prints `N tabs still running · run a1 to return` (`1 tab still running …` for one), or the existing resume hint from `session-shell.ts` when none runs.

### 10. Resident session selection and direct conflicts

`bin/cli.js` → `src/cli/dispatch.ts` already parses `--session`/`--session-dir` with `parseSessionSelection`. With `residentTabs=true`, the launch path resolves the target with `resolveSessionArgumentPath` and passes it to its own attach client, which sends `tab.create{kind:"a1", cwd, env, session}` with its client id. The server looks up the canonical file identity (milestone-1 lock identity) among live tabs: if a tab holds it, that client views it; otherwise the new tab's child acquires the writer lease before opening it, and on lease conflict the tab fails with the reason instead of writing. The selection is never stored as a server default.

In direct mode (`residentTabs=false` or fallback), a lease conflict found by milestone 3's guard prints `Session is open in another A1 process.` and, when stdin is a terminal, offers `[f] fork into a new session · [q] quit` using the existing fork path (`runtime.fork` in `workflow-runner.ts`, prompt in `src/features/owned-ui/session-fork-prompt.ts`); non-interactive invocations exit nonzero. It never starts a host.

### 11. Text-terminal extension fidelity certification

A fixture extension (`test/fixtures/extensions/text-terminal-fidelity/`, new) renders a custom component exercising keyboard (including kitty-protocol keys), mouse, bracketed paste, selection, OSC 52, OSC 8, cursor shape, wide and combining Unicode, alternate screen, and an inline-image request. A harness drives a scripted input sequence into (a) direct bare A1 run under a test PTY whose output is parsed by a libghostty-vt model, and (b) the same A1 in a resident tab, then compares retained cell grids, modes, clipboard writes, and hyperlink attributes. The image request must yield the text fallback in both. It runs on Windows x64, macOS, and Linux; evidence is per platform.

### 12. Prewarm, idle suspension, and settings

Settings are added to `OWNED_SETTING_DECLARATIONS` in a new Tabs section, with camelCase ids as required by the id pattern in `src/ui/settings/declarations.ts` (`tabsMax`, `tabsMaxConcurrentStarts`, `tabsPrewarm`, `tabsSuspendIdleAfterMinutes`, `tabsAutoName`), beside the `residentTabs`, `tabsUnresponsiveRestartSeconds`, and `tabsStallNoticeSeconds` settings added by earlier milestones. The dotted names in `docs/architecture/resident-tabs.md` (`tabs.max` and so on) denote these ids; task 10.1 updates the document to the camelCase ids. Caps: `tabsMax` 1–50 (default 10), `tabsMaxConcurrentStarts` 1–8 (default 2), `tabsPrewarm` 0–1 (default 1), `tabsSuspendIdleAfterMinutes` 0 or 5–1440 (default 60), `tabsAutoName` boolean (default on). Out-of-range stored values clamp with one notice. The settings version bumps with a migration entry. The resolved values are passed to the server on attach; the server applies the latest values it receives.

**Prewarm.** When `tabsPrewarm=1`, no visible start is pending, and visible tabs are below `tabsMax`, the server starts one hidden standby holder running `ui.js --tab --standby` in the cwd and environment of the most recent creating client. The standby loads Pi, settings, and extensions but reserves no session and holds no writer lease. Promotion on `tab.create` requires an exact cwd and environment-digest match; the child then reserves a new session identity, commits it to the registry before accepting input (architecture Decision 8), and becomes visible. A mismatch starts a cold tab and retargets the standby. The standby is excluded from the strip, idle suspension, and `tabsMax` accounting, and is stopped when the server's idle-exit timer starts.

**Idle suspension.** A tab is eligible when its status is `idle` or `done-unseen`, it has no pending request or queued input, and no client views it, continuously for the configured minutes. The server sets lifecycle `suspended`, stops the child gracefully, stops the holder after saving the last screen (milestone 4), and shows dim `◌`. Viewing the tab restarts the holder with `ui.js --tab --session <file>`. The setting description states that extension in-memory state is lost.

### 13. Performance budgets

Declared preview budgets (p95, each platform, measured on the exact build under test), to be added to `docs/architecture/resident-tabs.md`:

- cold launch with no server to first input in a new tab: direct bare-A1 startup budget from `startup-budget.ts` plus 800 ms;
- warm tab creation from a matching standby to first input: 250 ms;
- reattach first paint of the retained surface: 300 ms; first accepted input: 400 ms;
- input-to-process: 16 ms; output-to-present: 33 ms (from `terminal-host-proof-gate.md`).

A harness (`scripts/development/measure-resident-tabs.mjs`, new) records each measurement per platform in `implementation-evidence.md`. A miss is recorded and reported, not hidden; milestone 6 re-measures on the exact package.

## Risks / Trade-offs

- **[Alt shortcuts collide with terminal or IME behavior]** (macOS Option as composition key, legacy `ESC` prefix ambiguity) → Configurable bindings, launch conflict checks, and a documented note that macOS terminals must send Option as Meta; tests cover legacy and kitty encodings on each platform.
- **[Status gaps for request types A1 does not surface yet]** (no dedicated tool-permission prompt) → Count every pending extension UI request and trust prompt; a future permission prompt must register with the same pending-request counter, which a test enforces.
- **[Prewarmed standby loads project extensions for a cwd the user may not open]** → Standby starts only in the cwd of the last creating client, which has already been trusted, and is skipped when that cwd is untrusted.
- **[Idle suspension loses extension in-memory state]** → Default per user decision, disclosed in the setting text, and `0` disables it.
- **[Auto-naming spends model tokens]** → One small bounded call per tab with one retry; off with `tabsAutoName=false`.
- **[Read-only viewer confusion]** → Persistent `view only` indicator and one-key claim; no silent input loss without a visible reason.
- **[Budgets are guesses before measurement]** → Declared explicitly, measured per platform, misses recorded; milestone 6 owns the final numbers.

## Open Questions

- Whether macOS Terminal and iTerm2 default Option settings make `Alt+.`/`Alt+,` usable without user configuration; if not, the macOS default set may need different keys, decided from the fidelity evidence before merge.
