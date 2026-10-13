# Tasks

Milestone 5 of 6 for resident tabs (see `docs/architecture/resident-tabs.md`). The user approved the refined implementation scope after milestones 1–4 merged.

## 1. Baseline

- [x] 1.1 Reconcile with current `develop` after milestones 1–4. Re-copy the canonical text of `cli-session-resume` "Normal A1 accepts explicit session selection" and `launch-instance-lifecycle` "Explicit session selection belongs to the originating launch instance" from `openspec/specs/`, reapply this change's edits, and record any implementation-boundary deviation in `design.md`.
- [x] 1.2 Remove the milestone-2 minimal bridge requirement with reason and migration pointing to "The tab bridge reports structured A1 state and controller identity"; pass strict OpenSpec validation.

## 2. Tab bridge and status

- [x] 2.1 Add the complete bridge messages to protocol generation 1 as additive optional shapes with `unknown` fallbacks, frozen fixtures, updated fixture digest, and decoder fuzz coverage. Include sequenced status, pending requests, queued input, heartbeat, session/name source, interrupted prompt, resolved tab accent, visibility, rename, graceful stop, and origin-stamped detach requests. Prove milestone-4 peer interoperability with new methods disabled.
- [x] 2.2 Add a pure status deriver from Pi/owned engine events plus pending-request and queued-input counts. Register every extension UI and trust/permission prompting path, continue status reports while hidden, and prove terminal output/titles cannot influence status.
- [x] 2.3 Wire the authenticated child bridge only under `--tab`; keep credentials out of inherited environments and bridge captures free of prompts, transcripts, terminal bytes, and credentials. Degrade to process status and attach-local actions when unavailable.
- [x] 2.4 Add the deterministic server-core status state machine with sequence/incarnation rejection, attention/seen fan-out, persistence coalescing, per-tab accent propagation, and no suspended state. Throttle hidden child animation without stopping status or heartbeat reports.

## 3. V2 strip and mouse

- [x] 3.1 Add the native top strip using the v2 fixed presentation: normal RGB `38,38,38`/`170,170,170`, hover background `48,48,48`, active `55,55,55`/white, palette fallback, wallpaper-backed empty state, and right-aligned 12-hour clock. Do not add presentation settings.
- [x] 3.2 Implement grapheme/display-width chip layout with a 20-column cap, status decoration, always-visible `×`, viewed-chip-visible overflow `…`, reserved `+`, and empty hint. Golden-test ASCII, CJK, emoji ZWJ, combining marks, narrow terminals, and 50 tabs.
- [x] 3.3 Render working frames at v2's 80 ms cadence in each tab's reported A1 accent; render warning/success/error/dim semantic glyphs; drop BEL and every sound/notification sequence on each platform.
- [x] 3.4 Add overflow and right-click `Rename`/`Close` overlays, grapheme-aware inline rename with client/server validation, click-to-view, click-`×` close, `+` create, and 250 ms/one-column drag reorder with revision fencing and `│` marker.

## 4. Assignable shortcuts and host actions

- [x] 4.1 Declare tab actions in `src/features/resident-tab/shortcuts.ts`. Default only new (`Alt+A`), close (`Alt+W`), rename (`F2`), jump 1–10 (`Alt+1`…`Alt+0`), and failed-banner retry/fresh. Declare next/previous/move-left/move-right unbound but assignable through `keybindings.json`; conflict-check assigned bindings and list effective assignments in `/hotkeys`.
- [x] 4.2 Match decoded crossterm, kitty, and legacy key events before libghostty-vt encoding; consume assigned actions, consume out-of-range jumps without changing tabs, and forward unmatched input. Render failed/stalled banner actions from the effective table without exposing `/restart-tab`.
- [x] 4.3 Extract the clear/exit interval and implement fixed double-`Ctrl+C` detach: first press reaches the tab, second is consumed locally, and a selection-clearing press does not arm the chord.
- [x] 4.4 Add no tab-management slash commands: do not expose `/new-tab`, `/close`, `/tabs`, `/quit-all`, or `/restart-tab`. Keep existing `/name` synchronized with tab/session naming and keep existing `/quit` and empty-editor `Ctrl+D` as origin-stamped local-client detach routes.
- [x] 4.5 Implement close from `×`, `Alt+W`, context menu, and failed/stalled UI: busy confirmation, `desired=stopped`, 5-second graceful bridge stop, verified-tree termination, platform graceful fallback, last-tab empty state, and resumable committed session.

## 5. Automatic concurrent-client control

- [x] 5.1 Wire the milestone-1 controller-transfer barrier through server, holder, child, and attach client. Automatically claim the viewed tab on focus gain; when focus reporting is absent or a claim is pending, hold the first input and deliver it only after acknowledgement. Do not require `Enter` and do not render a persistent view-only banner.
- [x] 5.2 Release controllers on detach/disconnect, accept resize only from the current controller, reject stale revisions without bytes, and allow the newly active terminal to reclaim automatically through the same barrier.
- [ ] 5.3 Stamp `/quit` and empty-editor `Ctrl+D` at command admission; apply only while the origin controller remains current. Rejected or bridge-less requests keep A1 and the tab running and direct the user to double `Ctrl+C`. Print `1 agent still running run a1 to return.` or `N agents still running run a1 to return.` after detach. Prove two-client behavior on Windows x64, macOS arm64, and Linux x64.

## 6. Resident session selection

- [x] 6.1 Route bare `a1 --session`/`--session-dir` through the launching attach client; focus a live holder by canonical file identity only in that client or create a tab whose child acquires the writer lease first. Prove aliases converge and later bare launches do not reuse the selection.
- [x] 6.2 Add argument-free `a1 solo` as the explicit direct single-agent route, list it in help, reject extra arguments, and omit the Tabs settings section in that runtime. In direct mode, report a writer conflict and offer interactive fork through the existing path; fail non-interactively without starting a host or changing the resident session.

## 7. Extension fidelity

- [ ] 7.1 Add a text-terminal fidelity fixture and comparison harness covering keyboard/kitty keys, mouse, bracketed paste, selection, OSC 52, OSC 8, cursor shape, wide/combining Unicode, alternate screen, and image text fallback. Record independent Windows x64, macOS arm64, and Linux x64 results.

## 8. Auto-name, limits, and prewarm

- [x] 8.1 Remove the `residentTabs` setting, show only `tabsMax` (default 10, range 1–50) and `tabsAutoName` (default on) in resident Settings > Tabs, hide that section completely in `a1 solo`, and add clamping, version migration, settings-screen, launch-routing, and repository-local launch tests. Retire stored `residentTabs` and user-facing `tabsMaxConcurrentStarts`, `tabsUnresponsiveRestartSeconds`, and `tabsStallNoticeSeconds`; use internal concurrent-start default 2/hard cap 8, prewarm count 1/hard cap 1, unresponsive restart 120 seconds, and stall notice 300 seconds.
- [ ] 8.2 Enforce `tabsMax` on every creation path and the internal concurrent-start gate. Exercise ten concurrent starts per platform with models available.
- [x] 8.3 Implement child auto-naming after the first settled turn with bounded budget/timeout/retry, ≤16-character lowercase hyphenated normalization, deterministic fallback, and user-rename precedence. Reproduce v2's 600 ms rainbow, 45 ms/character typing, and 300 ms settle animation for automatic names only.
- [x] 8.4 Implement one hidden standby: no session or writer lease before promotion, exact cwd/environment match, committed session identity before input, retarget on mismatch, skip untrusted cwd, exclude from strip and `tabsMax`, and tolerate standby failure without affecting tabs.
- [x] 8.5 Prove every open tab keeps its process until explicit close and that no suspension setting, timer, lifecycle, or `◌` glyph exists.

## 9. Performance

- [ ] 9.1 Add the declared budgets to `docs/architecture/resident-tabs.md` and create `scripts/development/measure-resident-tabs.mjs` for cold launch, matching-standby creation, reattach first paint/input, input-to-process, and output-to-present. Record every value and miss independently on Windows x64, macOS arm64, and Linux x64.

## 10. Documentation and validation

- [x] 10.1 Update `docs/architecture/resident-tabs.md` and `resident-tabs-requirements.md` to the approved v2 appearance, per-tab accents, unbound navigation/reorder actions, strip-only management, automatic control transfer, the two resident-only Tabs settings, explicit `a1 solo`, internal supervision/start/prewarm constants, detach wording, always-on bare-A1 routing, and no idle suspension. Move this change's delivered requirements out of the target file.
- [ ] 10.2 Run focused TypeScript and native suites, bounded decoder fuzzing, two-client/fidelity/performance harnesses on all three platforms, strict OpenSpec validation, and documentation governance. Record independent evidence and confirm `a1 solo` and `a1 pi` stay direct without a Tabs settings section.
