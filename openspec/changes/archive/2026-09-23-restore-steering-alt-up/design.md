## Context

See `proposal.md` for the user-visible mismatch. Source inspection at planning base `2fd59d4b` found three distinct facts:

- `KEYBINDINGS["app.message.dequeue"]` follows pinned Pi's platform policy and resolves to `Alt+Q` on Windows/WSL but `Alt+Up` elsewhere.
- Bare A1 spreads that table into `OWNED_INPUT_KEYBINDINGS` without overriding dequeue, so its editor dispatch inherits `Alt+Q` on this Windows report.
- Bare A1's expanded startup help and pending-queue row independently hardcode `Alt+Up`, while the general `/hotkeys` presenter already reads effective declarations.

The existing dequeue callback and engine adapter already clear steering before follow-ups and place the recovered text in the editor. The defect is therefore in profile-specific binding and presentation alignment, not in queue clearing itself.

## Goals / Non-Goals

**Goals:**
- Give bare A1 one cross-platform `Alt+Up` default for queued-message restoration.
- Make all bare-A1 restore hints read the same effective declaration that dispatch uses.
- Preserve user overrides and reload behavior without rewriting user configuration.
- Keep the pinned comparison profile byte- and behavior-compatible with its upstream platform defaults.

**Non-Goals:**
- Change queue ordering, attachment recovery, compaction delivery, or submission modes.
- Rename the `app.message.dequeue` action or migrate persisted keybinding files.
- Change dialog-local `Alt+Up` actions such as model reordering.
- Alter pinned Pi's Windows/WSL `Alt+Q` default.

## Decisions

### 1. Override dequeue only in the bare-A1 input profile

Set `app.message.dequeue` to `Alt+Up` in `OWNED_INPUT_KEYBINDINGS`, alongside the existing bare-A1 thinking and model-selection deviations. Leave the shared pinned `KEYBINDINGS` table untouched. This keeps profile isolation explicit and lets the existing manager apply user bindings after defaults.

Alternative rejected: change the shared pinned table. That would repair bare A1 but silently diverge `a1 pi` from the pinned upstream behavior.

Alternative rejected: special-case raw `Alt+Up` input outside the declaration. That would bypass conflict handling, make overrides ambiguous, and preserve the listing/dispatch split.

### 2. Pass effective binding data lazily to both hint presenters

Extend queued-input presentation with a lazy effective-binding source, equivalent to the startup header's existing callback. Resolve and format `app.message.dequeue` when rendering so a keybinding reload or explicit override appears without reconstructing the shell. Use the same key-label grammar already used by shortcut help. The comparison profile continues to omit the custom queued hint and does not receive the bare-A1 source.

Update expanded startup help to read the effective dequeue key just as it already does for thinking-level cycling and model selection. The general hotkey listing remains declaration-driven and should need only regression assertions.

Alternative rejected: replace `Alt+Up` with `Alt+Q` in Windows-only strings. That would match today's upstream default but contradict the requested shortcut, remain stale under user overrides, and perpetuate duplicated policy.

### 3. Test terminal dispatch and rendered labels together

Focused tests will send the supported terminal encoding for `Alt+Up` through the owned editor, assert that the dequeue callback runs, and verify an alternate explicit binding supersedes it. Session/component tests will render pending queues and startup/hotkey help from defaults and overrides, then assert profile isolation against the pinned manager.

The behavioral test must exercise editor dispatch rather than calling `restoreQueuedInput()` directly; the existing direct method test proves queue recovery but cannot detect this regression.

## Risks / Trade-offs

- [A terminal emits an unsupported encoding for `Alt+Up`] → Use the shared keybinding matcher and its supported terminal sequences; include an interactive exact-candidate check rather than adding raw escape parsing.
- [A user override changes after the queue presenter is constructed] → Read effective bindings lazily on render and cover reload/current-config behavior.
- [`Alt+Up` is also used in a modal] → Keep the change scoped to the agent-input profile; modal-local managers retain ownership while active.
- [Pinned parity changes accidentally] → Leave `KEYBINDINGS` unchanged and assert the comparison profile still resolves its platform-specific upstream default.

## Migration Plan

No persisted migration is required. Existing explicit `app.message.dequeue` values remain authoritative. Shipping changes only the bare-A1 default when that action is not explicitly configured. Rollback restores the current platform-dependent bare-A1 default and the reported hint mismatch but does not make stored configuration incompatible.
