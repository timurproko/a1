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
- Auto-naming with the v2 title animation, one prewarmed standby, and a user-configurable tab limit after the core UX passes its tests. Open tabs keep their processes and are never idle-suspended.
- Measured performance per platform against declared budgets.

**Non-Goals:**

- Packaging, release retention, `a1 tabs` commands including `a1 tabs host status`, and preview certification (milestone 6).
- Reboot restore, split layouts, CLI tabs, image-protocol forwarding.
- Any bell, sound, or notification setting.

## Decisions

### 1. The complete bridge supersedes milestone 2's minimal bridge

The `resident-terminal-host` requirement "The tab bridge reports structured A1 state and controller identity" in this change supersedes the minimal bridge requirement milestone 2 added. Implementation removes or merges that requirement in this change's delta (task 1.2), so one bridge requirement remains canonical. All new messages are additive within protocol generation 1 (optional fields, `unknown` fallbacks, new fixtures and digest), so a milestone-4 server or child still interoperates with features disabled per method.

Messages added or completed:

- child → server: `bridge.status{incarnation, seq, state, pendingRequests, queuedInput, stopReason?, accent}`, `bridge.heartbeat{incarnation, seq}` every 5 s from the Node event loop, `bridge.session{file, name, nameSource}`, `bridge.prompt{interrupted}`, and `bridge.request{action, originClientId, originControllerRevision, args}` for `/quit` and empty-editor `Ctrl+D`.
- server → child: `bridge.visibility{visible}`, `bridge.rename{name, nameSource}`, `bridge.stop{deadlineMs}`, and `bridge.requestResult{requestId, outcome}`.

If milestone 3 already added `bridge.heartbeat` for liveness supervision, this milestone reuses it unchanged.

The bridge client is a new module `src/features/resident-tab/bridge.ts` (new file) with a pure status deriver `src/features/resident-tab/status-deriver.ts` (new file), wired in `src/composition/owned-ui.ts` only when `--tab` is present. Rejected: deriving status in the native holder from screen content (architecture Decision 7 forbids it); deriving it in the server from raw engine events forwarded verbatim (larger bridge, content leakage risk).

### 2. Status state machine lives in the server's sans-IO core

The child reports facts (working, pending request count, queued input, last `stopReason`, settled) and its resolved A1 accent color. The server core maps facts to the architecture Decision 7 states with priority `failed/crashed/restarting` > `needs-input` > `working` > `starting/restoring` > `error` > `done-unseen` > `idle`. `done-unseen` is `attentionSeq > seenSeq`: a working→settled transition increments `attentionSeq` when no client views the tab; any client viewing it sets `seenSeq = attentionSeq` and fans the change out to every client. `attentionSeq` and `seenSeq` are persisted with coalescing (at most one registry write per tab per second); volatile status is never persisted (architecture Decision 8). Reports with a superseded incarnation or non-increasing `seq` are dropped. A tab whose bridge is down or whose credential failed shows only process-level states and the launch accent. Rejected: computing status in each attach client (clients would disagree on `seen`).

### 3. The strip is drawn natively with Unicode grapheme widths

The attach client (`native/terminal-host`, new module `src/attach/strip.rs`) reproduces the v2 default strip at the top: normal chips use RGB background `38,38,38` with foreground `170,170,170`, hovered chips use background `48,48,48`, and the viewed chip uses background `55,55,55` with white text; palette terminals use v2's reverse/dim fallback. The empty state uses the v2 wallpaper treatment and the right edge carries the v2 12-hour clock. These are fixed presentation constants, not settings.

Each chip lays out: space, optional glyph and space, name, space, `×`, space, at most 20 columns. `×` is always visible and invokes the same close flow as `Alt+W`. Names are segmented with `unicode-segmentation` and measured with `unicode-width`, matched to libghostty-vt's grapheme-width mode so the strip and surface agree; clipping appends `…` at a grapheme boundary. Layout always reserves `+`; when chips overflow, the viewed chip stays visible and the rest collapse into a `…` chip whose menu is drawn as an overlay below row 0 (arrow keys, `Enter`, `Esc`; viewed tab marked). With zero tabs, row 0 shows only `+`, and the surface area shows the hint `Alt+A new tab · Ctrl+C Ctrl+C leave`. Progress frames are shared across chips and driven by one client timer at v2's 80 ms cadence, only while any visible chip is working. Rejected: drawing the strip in Node (Node never touches terminal bytes, architecture Decision 2); computing widths with UTF-16 length (v2's bug).

### 4. Fixed strip colors and per-tab accents

The launch path passes the fixed v2 chip palette and wallpaper/clock presentation data in an owner-only launch file. Status warning, success, error, and dim colors use A1 semantic roles. The working spinner uses the `accent` reported by that tab's bridge, so agents with different resolved accents retain their own color; the launch accent is the fallback before the bridge is ready. A live accent report changes only that tab's spinner. The strip does not add position, style, clock, time-format, or animation settings.

### 5. Shortcuts are declared in Node and matched natively

Tab actions are declared in a new `src/features/resident-tab/shortcuts.ts` with ids `tabs.new`, `tabs.close`, `tabs.retry`, `tabs.fresh`, `tabs.rename`, `tabs.jump1`…`tabs.jump10`, `tabs.next`, `tabs.previous`, `tabs.moveRight`, and `tabs.moveLeft`. Defaults are `Alt+A`, `Alt+W`, `F2`, and `Alt+1`…`Alt+0`; next, previous, move-right, and move-left are declared but unbound. User assignments come from the existing `keybindings.json` loaded by `KeybindingsManager`. At launch, Node assembles them against the owned `ShortcutRegistry` and Pi keybindings; a conflicting tab binding is disabled and reported once in the strip, never dispatched ambiguously. The effective table is passed to the attach client with the presentation file, and inside tabs `/hotkeys` gains a Tabs section from the same table (so listing and dispatch cannot diverge). The client matches decoded key events (crossterm, kitty protocol where available, legacy `ESC`-prefixed Alt otherwise) before libghostty-vt encoding; unmatched keys go to the tab.

Milestone 4's failed-tab banner (`[r] retry · [f] start fresh · [alt+w] close`) and its banner-local `Alt+W` handling are absorbed into this table: `tabs.retry` and `tabs.fresh` are declared actions bound to `r` and `f` only in the failed-banner scope (a disjoint scope, so they never shadow typing in a live tab), `tabs.close` is the same global close action, and the banner text is rendered from the effective bindings so a rebinding changes the hint. Restart remains a host-owned failed/stalled-tab action; no `/restart-tab` command is exposed.

The detach chord is fixed, not rebindable (user decision): the first `Ctrl+C` is forwarded unchanged and arms a timer equal to A1's clear/exit interval, which this change extracts from the literal in `clearOrExit()` into a named exported constant and passes to the client; a second `Ctrl+C` inside it is consumed as a local detach. A `Ctrl+C` that the client consumes to clear a host-owned selection does not arm the chord.

### 6. Mouse on row 0

The client enables SGR mouse with motion reporting on the outer terminal so it can show hover and drag. Row 0 events are never forwarded. Left click views; right click opens a `Rename`/`Close` overlay menu; a press held 250 ms or moved one column starts a drag that shows a `│` drop marker and commits `tab.reorder{expectedRevision}` on release. Rows below row 0 are offset by one and forwarded only if the child requested that mouse mode; otherwise host-owned selection applies as in the proof.

### 7. Rename, names, and auto-naming

`F2` or the menu opens an inline chip editor in the client (grapheme-aware cursor, `Enter`, `Esc`, click elsewhere). Validation (trim, strip controls, nonempty, ≤ 64 characters) runs in the client for feedback and again in the server core, which commits `tab.rename{expectedRevision}` with `nameSource=user` and sends `bridge.rename` so the child calls `setSessionName`. `/name` in a tab calls `setSessionName` as today and reports `bridge.session{name, nameSource:"user"}`. Default names are `agent` or `agent N` (smallest free N), assigned by the server core.

Auto-naming (`src/features/resident-tab/auto-name.ts`, new file) runs in the child after the first settled turn when `tabsAutoName` is on and the server's `nameSource` is `default`. It asks the tab's current model for a name with a 64-output-token budget and a 10 s timeout, retries once, normalizes to lowercase `[a-z0-9-]`, collapses hyphens, and truncates to 16 characters at a hyphen when possible. On failure it derives the name deterministically from the first prompt's first words with the same normalization. It reports `nameSource:"auto"`; the server rejects an auto name when the current source is `user`, so a concurrent rename always wins. Auto-naming never blocks or delays the turn. When the auto name arrives, the strip reproduces v2's title animation: 600 ms moving rainbow over the old title, the new title typed at 45 ms per character, then a 300 ms settle to foreground gray, with a plain typing fallback without truecolor. Manual `F2`, menu, and `/name` renames do not animate. Rejected: naming in the server (it runs no Pi code).

### 8. Close, quit-all, and graceful stop

`Alt+W` (including on a failed tab's banner), the always-visible `×`, and the right-click menu all reach `tab.close`; a failed or crashed tab is never busy, so it closes without confirmation. The failed/stalled banner may invoke the existing host-owned restart path, asking for confirmation when busy, but no restart slash command is exposed. If the tab's status is `working` or `needs-input`, or the bridge reports queued input, the origin client replaces row 0 with `Stop "<name>"? Enter stop · Esc cancel`. Stop sets `desired=stopped` (so the crash restart path does not fire), sends `bridge.stop{deadlineMs: 5000}` (the child runs its bounded quit from #732, synchronizes the session, and exits), then has the holder terminate the verified tree after the deadline. Without a bridge, the holder sends the platform's graceful signal first (`SIGHUP` to the PTY session on macOS/Linux, ConPTY close then `CTRL_CLOSE_EVENT` on Windows). Closing the last tab leaves the empty state. No new tab-management slash commands are added.

### 9. Two clients, one controller

Each client has its own viewed tab (server-side per client). Each tab has at most one controller, transferred through the milestone-1 barrier (`tab.claimInput{expectedControllerRevision}`). An outer-terminal focus-gained event automatically starts a claim for the client's viewed tab. If focus reporting is unavailable or no claim has completed, the first input event starts the claim; that event is held in the client (bounded) and delivered after acknowledgement. The prior controller becomes non-controlling without an `Enter` step or a persistent view-only banner. Input from a terminal that becomes active again automatically reclaims through the same barrier. A client that detaches or disconnects releases its controllers. Resize follows the controller.

Client-scoped `/quit` and empty-editor `Ctrl+D` are stamped by the child with the controller identity and revision observed at command admission, which the barrier makes causal. The server applies them only if that revision is still current; otherwise it rejects them, keeps A1 and the tab running, and tells the user to press `Ctrl+C` twice. `/quit` quits the local attach client, not the tab. If the platform's barrier is disabled (milestone 1 allows that), the tab keeps a single controller, automatic transfer is refused safely, and client-scoped commands work only for that controller.

On detach the client restores the outer terminal (milestone 2 path) and prints `N agents still running run a1 to return.` (`1 agent still running run a1 to return.` for one), or the existing resume hint from `session-shell.ts` when none runs.

### 10. Resident session selection and direct conflicts

`bin/cli.js` → `src/cli/dispatch.ts` already parses `--session`/`--session-dir` with `parseSessionSelection`. With `residentTabs=true`, the launch path resolves the target with `resolveSessionArgumentPath` and passes it to its own attach client, which sends `tab.create{kind:"a1", cwd, env, session}` with its client id. The server looks up the canonical file identity (milestone-1 lock identity) among live tabs: if a tab holds it, that client views it; otherwise the new tab's child acquires the writer lease before opening it, and on lease conflict the tab fails with the reason instead of writing. The selection is never stored as a server default.

In direct mode (`residentTabs=false` or fallback), a lease conflict found by milestone 3's guard prints `Session is open in another A1 process.` and, when stdin is a terminal, offers `[f] fork into a new session · [q] quit` using the existing fork path (`runtime.fork` in `workflow-runner.ts`, prompt in `src/features/owned-ui/session-fork-prompt.ts`); non-interactive invocations exit nonzero. It never starts a host.

### 11. Text-terminal extension fidelity certification

A fixture extension (`test/fixtures/extensions/text-terminal-fidelity/`, new) renders a custom component exercising keyboard (including kitty-protocol keys), mouse, bracketed paste, selection, OSC 52, OSC 8, cursor shape, wide and combining Unicode, alternate screen, and an inline-image request. A harness drives a scripted input sequence into (a) direct bare A1 run under a test PTY whose output is parsed by a libghostty-vt model, and (b) the same A1 in a resident tab, then compares retained cell grids, modes, clipboard writes, and hyperlink attributes. The image request must yield the text fallback in both. It runs on Windows x64, macOS, and Linux; evidence is per platform.

### 12. Prewarm, limits, and settings

Two settings are added to `OWNED_SETTING_DECLARATIONS` in the Tabs section: `tabsMax` (default 10, range 1–50) and `tabsAutoName` (default on). Out-of-range `tabsMax` values clamp with one notice. The settings version bumps with a migration entry. `tabsMaxConcurrentStarts` is removed from the user-facing settings surface and becomes an internal default of 2 with hard cap 8; the existing value is ignored after migration. Prewarm is an internal count of 1 with hard cap 1. The resolved user-facing values and internal constants are passed to the server on attach; the server applies the latest values it receives.

**Prewarm.** When the internal prewarm count is 1, no visible start is pending, and visible tabs are below `tabsMax`, the server starts one hidden standby holder running `ui.js --tab --standby` in the cwd and environment of the most recent creating client. The standby loads Pi, settings, and extensions but reserves no session and holds no writer lease. Promotion on `tab.create` requires an exact cwd and environment-digest match; the child then reserves a new session identity, commits it to the registry before accepting input (architecture Decision 8), and becomes visible. A mismatch starts a cold tab and retargets the standby. The standby is excluded from the strip and `tabsMax` accounting, and is stopped when the server's idle-exit timer starts.

**No idle suspension.** Every open tab retains its holder and A1 process until it is explicitly closed. Closing gracefully stops and removes the tab while preserving its resumable Pi session. This change adds no suspension timer, setting, lifecycle state, or `◌` glyph.

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
- **[Auto-naming spends model tokens]** → One small bounded call per tab with one retry; off with `tabsAutoName=false`.
- **[Automatic control transfer surprises a second client]** → Claims still pass through the causal barrier, focus is preferred, first input is held until acknowledgement, and stale input or child requests are rejected rather than delivered under the wrong controller.
- **[Budgets are guesses before measurement]** → Declared explicitly, measured per platform, misses recorded; milestone 6 owns the final numbers.

## Open Questions

None. Next/previous and move-left/right are intentionally unbound by default, avoiding terminal-specific Option assumptions while remaining assignable.
