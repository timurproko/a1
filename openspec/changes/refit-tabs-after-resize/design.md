## Context

Each resident child runs inside a holder-owned pseudoterminal. The initial fix sent current geometry immediately after selecting a hidden tab. That guarantees eventual convergence, but selection can still expose a freshly subscribed old-size child surface before the resize commit arrives, producing a visible jump.

The server already knows which client controls each viewed tab and disables full-surface serialization for globally hidden holders. Those holders continue parsing and committing locally, so they can be resized without painting anything to the outer terminal. This permits background pre-fitting while retaining controller authority for tabs another client is actively viewing.

## Goals / Non-Goals

**Goals:**

- Fit eligible hidden resident tabs as soon as the authoritative outer terminal changes size.
- Make tab activation publish only a surface for the requesting controller's current geometry.
- Apply the same ordered convergence when attaching directly to an already-running tab.
- Preserve coherent switch presentation and existing controller ownership rules.

**Non-Goals:**

- Resizing a tab currently viewed or controlled by another client.
- Giving a read-only spectator geometry authority over any shared child.
- Changing child rendering, terminal emulation, or resize semantics inside the holder.

## Decisions

### 1. Pre-fit globally hidden, unclaimed holders on authoritative resize

When a controlling client reports an outer resize, the server will route that geometry to its selected holder and best-effort forward the same frame to every holder that no client currently views and no client controls. Hidden holders already suppress full-surface serialization, so their PTYs and retained terminal state reflow in the background without painting. Tabs viewed or controlled by another client are excluded.

### 2. Carry geometry inside the view request

A view request will include the requesting attach client's current child columns, rows, and geometry generation. After the server grants control of the target, it will queue that targeted resize before enabling the target's surface subscription and visibility. The holder therefore processes geometry before serializing the fresh surface that can replace the prior tab. This is also the fallback when a holder started after the last background resize or otherwise missed pre-fitting.

The attach client will no longer send a separate resize after each view request. Removing that second frame avoids a redundant post-selection reflow when the hidden holder is already fitted.

### 3. Keep initial attachment convergence

Attach startup without an explicit target still sends the current resize after admission, which both converges the selected existing holder and pre-fits eligible hidden holders. Startup with an explicit target carries geometry in the view request so the server stages it before that target's fresh surface publication.

### 4. Keep stale-surface parking as the presentation barrier

The server may retain an old-size surface from before background pre-fitting because hidden holders do not serialize. It remains marked stale. The attach view model keeps the previous coherent screen until the holder publishes the newly subscribed complete current-geometry surface or the existing bounded recovery expires. The reordered resize/subscription path prevents an intermediate old-geometry fresh surface from committing.

## Risks / Trade-offs

- [Background resize adds work to hidden children] → Resize only globally hidden, unclaimed holders and reuse the existing bounded PTY resize/reflow path; no hidden full-surface serialization is enabled.
- [A hidden holder misses the background frame] → View-carried geometry is queued before subscription as the activation-time fallback.
- [Two clients use different sizes] → Never pre-fit a tab another client views or controls; spectators remain non-authoritative.
- [A slow child delays the switched view] → The existing bounded stale-surface wait remains the fallback, preserving the previous coherent frame rather than showing an old-size target frame.

## Migration Plan

No stored data migration is required. The view payload adds optional geometry so older same-generation senders remain decodable. Rolling back restores activation-time post-selection convergence and removes background hidden-tab pre-fitting.
