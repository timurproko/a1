# Design

## Context

See `proposal.md` for the observed failures and capability deltas.

The resident interface has three presentation owners. Each A1 child renders into its own PTY, a holder parses that stream into retained Ghostty state and emits `Surface` messages, and the attach client combines a selected surface with the tab strip and host overlays. The current code describes each `Surface` as complete, but `surface_message` calls `frame_at` without first requesting a full repaint. After the initial frame, Ghostty may therefore emit only dirty rows. Attach replaces `latest_surface` with those bytes and later reuses it as though it were a complete body. Status, menu, close, and topology repaints can consequently replay only the latest patch, while a hidden holder may not send a fresh complete surface until another event. This mismatch explains stale rows, apparent buffering, and flashing despite the requested/committed view model.

Popup lifetime has a separate concrete defect: the `+` menu opens on left-button down, then the matching left-button up enters the generic popup dismissal branch and closes it before a row can be pointed at. Palette fallback also uses reverse video, which produces the light block shown in the screenshots rather than the approved dark v2 menu in capable Windows terminals whose truecolor support is not currently recognized.

Settings currently travels through `tab.open-settings` to the viewed Agent bridge. That route depends on Agent input/controller health, displaces the Agent surface, advertises `/settings` inside every child, and cannot provide the v2 singleton utility-tab behavior. The registry already carries a string `kind`, but all current records are `a1`, and holder launch has only the conversational child mode.

The configured tab quota is threaded from owned Settings through bootstrap, attach, and server admission. It creates the visible refusal requested for removal and is not needed for process isolation; start concurrency, protocol sizes, process verification, memory availability, and operating-system failure remain separately bounded.

## Goals / Non-Goals

**Goals:**

- Make every visible frame derive from one complete current child surface plus current strip/overlay state.
- Keep every Agent's PTY drain, retained terminal updates, engine work, and switch-time presentation independent while several agents run.
- Make popup mouse interaction survive complete press/release sequences and match the approved dark v2 appearance.
- Give global Settings one singleton tab and one resident shortcut without a slash-command duplicate.
- Remove artificial tab-count enforcement and all tab-limit presentation.
- Keep create and close transitions quiet, atomic, and free of lifecycle artifacts.
- Preserve normal solo-agent behavior, sessions, recovery, and configurable tab actions.

**Non-Goals:**

- Reintroducing the complete v2 in-process app host, workspaces/sidebar, Git tab, arbitrary CLI tabs, or split panes.
- Removing bounded start concurrency, protocol/message limits, diagnostic bounds, process-containment checks, or ordinary resource-error reporting.
- Making Settings profile-specific; it remains global to the selected A1 profile.
- Removing legitimate background attention (`?`, completed-unseen, or real failure) from a surviving Agent tab.
- Changing `a1 pi` command parity or direct `a1 solo` Settings behavior.

## Decisions

### 1. Distinguish Agent and Settings records at the resident registry boundary

The registry and tab-list projection will use a bounded tab kind with `agent` and `settings` values. Historical `a1` records normalize to `agent`. Agent records keep session identity, recovery, naming, status, and restart behavior. Exactly one Settings record may be live per profile; opening Settings activates that record when it exists and otherwise starts it through a dedicated lifecycle request. It has the fixed title `Settings`, cannot auto-name or rename, owns no prompt journal or resumable conversation, and is excluded from Agent maintenance counts where the distinction matters.

The Settings child will run the owned route host in a utility launch mode. Composition will extract a profile-scoped settings backend from session-shell startup so the utility can load A1 declarations and Pi setting descriptors without creating or claiming an Agent session. Its terminal surface remains holder-owned like any other resident tab, preserving the existing native rendering, input, crash isolation, and release-retention architecture.

Closing the Settings route, `Alt+W`, or its context-menu Close removes the utility tab. Selecting Settings from the launcher or shortcut while it is active is idempotent rather than injecting another route command.

**Alternatives considered:** opening Settings inside the viewed Agent preserves the current defect and is not a separate tab; disguising a normal conversational Agent as Settings creates an unused session and leaves an Agent editor behind when Settings closes; rendering Settings in Rust duplicates the owned UI and its settings backends.

### 2. Add a resident Settings action and context-sensitive command catalog

A new `tabs.settings` action will default to `Alt+Period` (`alt+.`), participate in the same conflict projection as other tab actions, and appear under Tabs in keyboard shortcuts. The add menu reads the effective label, so it renders `Settings  Alt+.` under the default binding. The action and menu both send the singleton Settings lifecycle request.

Resident Agent composition will remove `settings` from the built-in workflow/autocomplete catalog and reject direct `/settings` execution. Direct `a1 solo` retains the owned command, and `a1 pi` retains pinned Pi behavior. Any resident prompt-adjacent guidance that currently tells the user to use `/settings` will name the effective Settings shortcut or launcher instead.

**Alternatives considered:** a fixed unconfigurable key would bypass conflict handling; retaining the hidden executable command leaves two resident entry models and makes autocomplete suppression cosmetic only.

### 3. Model popup lifetime as complete pointer gestures

Popup input will distinguish motion, press, drag, release, and wheel. The release corresponding to the strip press that opened a menu is consumed without dismissal. Motion updates the enabled row under the pointer; left-button press and release on an enabled row invoke exactly once; separator rows stay inert; presses outside dismiss. Right-button release and unrelated release traffic do not close a newly opened menu. Keyboard navigation continues to skip separators and Enter invokes the active item.

Menu rendering will use the v2 RGB colors and one-cell padding whenever the terminal supports direct color. Capability detection will include the supported Windows Terminal/Git Bash environment instead of treating absent `COLORTERM` as proof that truecolor is unavailable. Palette fallback will map to stable dark background/foreground colors rather than reverse video that turns the popup into a light rectangle.

**Alternatives considered:** opening on mouse-up still complicates drag and double-click ownership; delaying dismissal with a timer is race-prone; retaining reverse-video fallback cannot guarantee a dark menu.

### 4. Remove the user quota while retaining real resource safety

`tabsMax` will be removed from owned declarations and the Settings Tabs section. Bootstrap, attach start, and server admission will stop carrying or enforcing a configured tab count and will never emit `tab-limit`. Existing stored `tabsMax` remains an unknown preserved property so downgrade-safe writes do not destroy it.

Creation can still fail for a real bounded operation: start-concurrency saturation beyond its wait policy, process launch failure, persistence failure, protocol refusal, containment failure, or operating-system resource exhaustion. Those failures use one concise stable overlay and do not masquerade as a count quota. Start concurrency stays capped because it bounds simultaneous expensive launches, not how many completed tabs a user may keep.

**Alternatives considered:** raising 50 to a larger number keeps an arbitrary failure and message; silently recycling tabs violates explicit-close residency; unbounding concurrent starts would reintroduce launch storms without increasing usable open-tab count.

### 5. Make input ownership an acknowledged barrier and keep internal refusal silent

Attach will track controller state for the requested/committed tab. On view/focus transfer, it requests ownership before forwarding user keyboard, paste, or surface-pointer input and retains a bounded ordered pending input transaction until `tab.inputClaimed` acknowledges the revision. The server and holder continue fencing by revision. A failed transfer discards no accepted prefix: the pending transaction is either delivered once after acknowledgement or refused through a user-actionable control-transfer failure.

`read-only-viewer` is an internal race/status code and will never become `transient_notice`. Focus traffic, release traffic, and stale controller responses remain silent. The empty state always hides the child cursor and cannot acquire an input-rejection overlay, leaving only `+` and its hover state.

**Alternatives considered:** hiding the notice without fixing admission would silently lose keys; forwarding before acknowledgement reproduces the race; persistent takeover prompts contradict automatic resident control.

### 6. Make `Surface` completeness true and preserve live partial progress

The holder will explicitly request a full retained repaint before every `Surface` designated complete. A fresh subscription, resize, restart, and view request therefore emits every visible child row plus modes and final cursor, not only rows still marked dirty. Attach will never replace its complete-body cache with an incremental patch.

While a tab is viewed, output bursts remain coalesced through the holder's wake loop and the client's one replaceable render slot, but each delivered message is a complete latest frame. While hidden, the holder continues draining PTY output and updating Ghostty state without waiting for another tab or client. On selection it immediately produces a full frame from that already-current state, then continues complete live frames as new output arrives. Per-tab revisions are compared only within that tab, so a high revision in the first Agent cannot suppress lower revisions from a later Agent.

Focused integration fixtures will run multiple independently scripted streaming children, switch repeatedly before any settles, and assert that each target reveals successive partial tokens—not only its final frame—while the other children keep advancing. A slow attach lane will prove replacement remains local and bounded.

**Alternatives considered:** teaching attach to interpret and merge ANSI patches duplicates terminal emulation; always forwarding every hidden frame wastes client bandwidth; final-only hidden snapshots reproduce the reported catch-up behavior.

### 7. Commit quiet topology transitions and ignore late intentional-close events

A created Agent or Settings tab remains staged until its registry record and first complete surface are both available, then appears and becomes active in one presentation. Starting/restoring animation is not shown for this ordinary successful path. Existing tabs are not repainted from transient lifecycle snapshots while the create request is pending.

Close marks the target as intentionally stopping before termination begins. The server excludes it from visible topology at the accepted close boundary and ignores later holder exit, bridge status, surface, or failure reports for that tombstoned incarnation. Attach commits removal with the selected survivor's complete surface; for the last tab it clears once to the cursor-hidden plus-only state. It never paints a red failure glyph, close `X`, read-only snapshot, or notice for a successful close. Real unrequested crashes of still-live tabs retain failure status and recovery actions.

Strip-only state changes use row-bounded damage with explicit cursor restoration. Full child frames do not clear the terminal. Equivalent registry/status frames are discarded before output, and synchronized-update markers supplement rather than substitute for coherent write ordering.

**Alternatives considered:** waiting for child exit before removing the chip exposes the exact stopped/failed intermediate state in the screenshots; treating every holder exit as failure cannot distinguish intentional close; clearing between strip and body guarantees visible flashing on terminals without synchronized updates.

### 8. Reuse grapheme-safe rename editing with explicit word boundaries

Inline rename will add Ctrl+Left and Ctrl+Right movement over Unicode grapheme indices. Word boundaries follow runs of whitespace, word characters, and punctuation so repeated movement is deterministic and never splits a grapheme. Existing Left/Right, Home/End, Backspace/Delete, Ctrl+A, paste, Enter, and Escape behavior remains. Ctrl+Shift variants may extend selection only if supported by the shared line-editing contract; they are not required by this change.

## Risks / Trade-offs

- **[Complete surfaces are larger than dirty patches]** → Send only the latest coalesced frame through one replaceable lane, forward only viewed-tab frames to clients, and measure output-to-present against the existing budget.
- **[A dedicated Settings process adds one resident process]** → Keep it singleton, session-free, and explicitly closable; reuse holder isolation and stop it when its tab closes.
- **[Engine setting descriptors may currently be session-coupled]** → Extract only the settings port behind an explicit profile-scoped adapter; do not create a hidden conversational session as a shortcut.
- **[Removing a tab count allows users to exhaust machine resources]** → Keep launch concurrency, protocol, process, persistence, and OS failures bounded and visible; never claim successful creation before process/registry commit.
- **[Controller acknowledgement adds a short input hold]** → Bound the barrier, preserve exact order, wake on acknowledgement, and prefer a few milliseconds of safe delay over lost input and read-only notices.
- **[Registry kind migration affects running cohorts]** → Default historical `a1`/missing kinds to Agent, keep generation-compatible fields additive where possible, and fail closed on unknown kinds.
- **[Terminal capability detection varies]** → Test truecolor, 256-color, Git Bash/Windows Terminal, and no-color fixtures; palette output must remain dark without relying on reverse video.

## Migration Plan

1. Add tab-kind compatibility and the singleton Settings lifecycle without changing historical Agent records.
2. Add utility Settings composition and the resident `tabs.settings` action, then hide the resident Agent `/settings` command.
3. Remove `tabsMax` declaration/transport/admission while preserving its stored key as unknown data.
4. Correct complete-surface generation and multi-holder switching before changing topology presentation, so later repaint work always has authoritative frames.
5. Fix input-claim buffering, popup gesture lifetime/colors, close tombstones, staged create, and rename word motion.
6. Existing sessions, registry records, keybindings, and profile documents remain usable. Rollback sees Settings records as unsupported unless the compatibility reader filters them; therefore the final implementation must either keep them additive/readable by the prior generation or require the ordinary explicit host stop at the existing cohort-version boundary.
