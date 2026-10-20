# Design

## Context

This change continues `decouple-session-architecture`, which left the resident server as `roles/server/{mod,attach,holder,bridge,lifecycle,standby,controller,registry}.rs` with one registry, viewer, restart, respawn, and reply path, and recorded `run_attach`, `serve_holder`, `serve_attach`, and `serve_bridge` in the size ratchet. Native tests run only in CI on the maintainer's workstation, and attach interaction can only be judged by using the tabs, so every step here is one commit followed by a CI run and manual testing.

## Goals / Non-Goals

**Goals:**

- At most one interaction mode at a time in the attach client, resolved by one `match`.
- The attach client is drivable by the simulator.
- Per-tab server state has one owner in the core.
- No reader thread sleeps or blocks on a recovery wait.

**Non-Goals:**

- Any change to the resident wire protocol, registry document, or credentials.
- Any user-visible behavior change.

## Decisions

### 1. Core-owned input and frame types come first

The popup menu, rename editor, and tab drag depend on crossterm `KeyCode`/`KeyModifiers`, `strip::StripTab`, `strip::StripFrame`, `StripHit`, and attach-local rendering helpers. `core` must stay sans-IO and must not depend on the role layer, so the first step adds core types (`AttachKey`, `AttachMouse`, `StripHitKind`, a strip snapshot) and conversions in `roles/attach.rs`; only then do the menu, editor, and drag state move.

### 2. `core::attach` is a pure state machine

```text
pub enum Mode { Idle, Popup(PopupMenu), Rename(RenameEditor), Drag(TabDrag) }
pub struct View { prompt_view, settings_shown, settings_prewarm_pending, settings_absent_since, pending_jump, pending_created_activation }
pub struct State { mode, view, hovered, failed_tab, close_fallback, notice, user_input_pending, registry_revision, pending_manual_name, deferred, columns }
pub struct Context<'a, T: TabView> { tabs, viewed, requested, strip: &StripSnapshot, shortcuts: &dyn ShortcutLabels, mouse_tracking }
pub enum Event { Key { key, action }, Mouse(AttachMouse), Paste(String), Resize { columns }, Focus { gained }, Server(ServerEvent), Tick }
pub enum Effect { Send(Request), View(tab_id), AwaitFirstDraw, CancelViewRequest, Renamed, Write(frames), ForwardKey, ForwardMouse, ForwardPaste, ForwardFocus, Paint { clear } }
impl State { pub fn step(&mut self, context: &Context<T>, event: Event, now: Duration) -> Vec<Effect> }
```

`Mode` is one enum, so a popup, a rename prompt, and a drag never coexist; opening one replaces the other, and a view change closes a popup or prompt but not the drag whose click requested it. The coherent view transition (the requested tab, staged topology, and pending surface) stays with the role's presentation `ViewModel`, which owns the surfaces; `View` holds only the client's own intent. Tab shortcuts are resolved by the role's `TabBindings` and arrive as the key's `action`. Key, mouse, and paste encoding and the Ctrl+C chord stay in the role: a key that reaches the child returns `ForwardKey`, and the role then asks `State::forward_key` whether the stalled and failed-tab rules restart, map, or drop it. `roles/attach.rs` keeps the handshake, the reader threads, `OuterTerminal`, `OuterWriter`, `AttachServerWriter`, `TabBindings`, `TimeFormatWatch`, presentation composition, and the encoders; a `Client` applies each step's effects in order, replacing the nine local macros.

**Alternative considered:** helper functions over a struct of the same locals. Rejected because it keeps implicit modes and does not make the client simulable.

### 3. Per-tab server state moves into `core::server::TabState`

`surfaces`, `launches`, `holders_terminating`, `holders_starting`, `bridge_status_sequences`, `status_persist_pending`, and `status_last_persist` become fields of the core's per-tab state; handlers read them through `locked.core`.

### 4. Recovery waits are timer effects

The restart delay and the recovery-slot wait become `Effect::ArmTimer` from `core::server::step`, completed by the supervision tick, so holder and bridge reader threads keep processing their peer's frames.

## Risks

- **Interaction regressions the tests do not pin.** Mitigation: the existing `roles/attach.rs` unit tests run against the core; the simulator asserts mode exclusivity; every step is followed by manual tab testing before the next.
- **Restart timing changes.** Mitigation: role integration restart and recovery cases stay green; a new unit test proves a reader thread processes input during a restart delay.

## Sequencing

1. Core input and frame types with conversions (no behavior change).
2. Move the menu, editor, drag, close fallback, and deferred input into `core::attach`.
3. The state machine and the reduced `run_attach`.
4. The simulator attach driver.
5. Per-tab state into `TabState`.
6. Timer-driven recovery waits.

Each step lowers the size-ratchet entries it shrinks and starts by merging current `origin/develop`.
