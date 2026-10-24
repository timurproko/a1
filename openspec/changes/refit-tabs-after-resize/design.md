## Context

Each resident child runs inside a holder-owned pseudoterminal. Outer resize events currently reach only the tab viewed by that attach client, which preserves controller authority when multiple clients use different terminal sizes. A hidden tab therefore retains its previous geometry. The switch path requests the hidden tab's retained surface but does not send the attach client's current size afterward, so no new-size child frame is guaranteed and the bounded stale-surface fallback can expose content laid out for the old dimensions.

The attach presentation model already parks a retained stale surface while it waits for a fresh requested surface. The missing operation is convergence of the newly selected holder to the requesting controller's current geometry.

## Goals / Non-Goals

**Goals:**

- Make every selected resident tab fit the current attach terminal after the terminal was resized on another tab.
- Apply the same convergence when attaching directly to an already-running tab at a different size.
- Preserve coherent switch presentation and existing controller ownership rules.

**Non-Goals:**

- Resizing every hidden tab whenever any client changes size.
- Giving a read-only spectator geometry authority over a shared child.
- Changing child rendering, terminal emulation, or resize semantics inside the holder.

## Decisions

### 1. Couple a view request with the requesting terminal's current geometry

The attach client will send the tab-view request first and then send its current resize frame on the same ordered server stream. The server processes the view before the resize, so the resize is routed to the newly selected holder. This reuses the existing resize protocol, epoch fencing, geometry generation, PTY resize, and retained-terminal reflow instead of adding a second geometry mechanism.

### 2. Reapply geometry during initial attachment too

Attach startup will send the current resize after any requested tab selection and before ordinary tab-list traffic. A newly created holder receives a harmless redundant resize, while an existing selected holder converges immediately to the attaching terminal.

### 3. Do not broadcast resize to all holders

Broadcasting one client's dimensions would resize tabs controlled by another differently sized client and violate controller authority. Activation-time targeting updates only the tab this client has just selected.

### 4. Keep stale-surface parking as the presentation barrier

The server may immediately re-offer the selected tab's retained old-size surface, but it remains marked stale. The attach view model will keep the prior coherent screen until the holder's resize produces a fresh complete surface or the existing bounded recovery expires. Regression coverage will assert the ordered view/resize request and current-geometry commit behavior.

## Risks / Trade-offs

- [A slow child briefly delays the switched view] → The existing bounded stale-surface wait remains the fallback; the change adds the missing prompt for a fresh frame without introducing an unbounded wait.
- [A redundant resize causes extra work when geometry already matches] → Tab activation is infrequent relative to rendering, and the holder's existing resize path is bounded and authoritative.
- [Two clients use different sizes] → Only the client that acquires the viewed tab's controller routes resize to that holder; spectators continue fitting the controller-sized surface.

## Migration Plan

No stored data or protocol migration is required. Rolling back restores the previous behavior where hidden tabs retain their last viewed geometry until another resize reaches them.
