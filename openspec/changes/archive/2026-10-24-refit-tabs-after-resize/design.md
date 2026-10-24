## Context

Each resident child runs inside a holder-owned pseudoterminal. Hidden holders now receive authoritative geometry in the background, and activation queues any missed target resize before fresh surface subscription. This removes switch-time reflow, but the active attach client still presents each intermediate outer-terminal size while the user drags the window boundary. The child, tab strip, overlays, and cursor can therefore visibly jump or flash many times during one resize gesture.

The attach presentation path already owns complete synchronized outer frames and receives resize events independently from holder surfaces. It can temporarily replace the whole UI with a stable host-owned curtain, continue resizing children and updating retained state behind it, then restore one complete current-geometry frame after the event burst settles.

## Goals / Non-Goals

**Goals:**

- Fit eligible hidden resident tabs as soon as the authoritative outer terminal changes size.
- Make tab activation publish only a surface for the requesting controller's current geometry.
- Hide all active tab and strip reflow while outer resize events are arriving.
- Show the live terminal dimensions in a centered two-line application-style resize status.
- Hold the resize curtain briefly after resizing stops, then reveal current content through a short dim-to-normal transition.
- Preserve existing controller ownership rules.

**Non-Goals:**

- Resizing a tab currently viewed or controlled by another client.
- Giving a read-only spectator geometry authority over any shared child.
- Changing child rendering, terminal emulation, or PTY resize semantics inside the holder.
- Adding a configurable resize delay or visual style setting.

## Decisions

### 1. Pre-fit globally hidden, unclaimed holders on authoritative resize

When a controlling client reports an outer resize, the server routes that geometry to its selected holder and best-effort forwards the same frame to every holder that no client currently views and no client controls. Hidden holders suppress full-surface serialization, so their PTYs and retained terminal state reflow in the background without painting. Tabs viewed or controlled by another client are excluded.

### 2. Carry geometry inside the view request

A view request includes the requesting attach client's current child columns, rows, and geometry generation. After the server grants control of the target, it queues that targeted resize before enabling the target's surface subscription and visibility. The holder therefore processes geometry before serializing the fresh surface that can replace the prior tab. This remains the fallback when a holder started after the last background resize or otherwise missed pre-fitting.

The attach client does not send a separate resize after each view request. Removing that second frame avoids a redundant post-selection reflow when the hidden holder is already fitted.

### 3. Replace intermediate active frames with a resize curtain

On every accepted outer resize event, the attach client immediately offers a complete synchronized presentation that clears the old UI, hides the cursor, and shows `🖥️` above `Resize <columns> x <rows>` with each row centered independently in the terminal's quiet presentation role. The next resize event replaces that complete curtain with the new dimensions. Ordinary tab, surface, animation, notice, and clock paints continue updating internal state but are suppressed from the outer terminal while the curtain is active.

The curtain uses the existing single-slot outer presentation writer rather than direct terminal writes. This lets a newer curtain replace queued work, keeps synchronized-update framing, and makes the composer aware that the old tab UI is no longer the visible baseline.

### 4. Hold briefly, then reveal through a dimmed frame

Each resize event restarts a 160 ms quiet interval. After that interval, the attach client waits until the currently viewed holder has published a surface newer than the pre-resize surface. Landing or no-tab views need only the quiet interval. This deliberate hold keeps the final dimension curtain visible long enough that stopping a resize does not feel like an abrupt cut.

The first settled UI frame is complete and synchronized but rendered with terminal faint intensity across the tab strip, overlays, landing or legacy bytes, and every structured child style. The child cursor remains hidden. After 100 ms, the attach client forces the same complete current presentation at normal intensity and restores its cursor. Any ordinary state update during the fade remains dimmed, and a new resize cancels the fade and returns immediately to the curtain.

A one-second maximum from the latest resize prevents a failed or disconnected holder from leaving the terminal permanently behind the curtain. That bounded fallback enters the same dimmed reveal using the newest retained presentation rather than cutting directly to full intensity.

### 5. Keep initial attachment convergence and controller isolation

Attach startup without an explicit target sends current geometry after admission, converging the selected existing holder and pre-fitting eligible hidden holders. Startup with an explicit target carries geometry in the view request. Read-only spectator resize remains ignored, and background fitting never changes a tab another client currently views or controls.

### 6. Keep centered application-state copy consistent

The resize curtain follows the shared two-row empty-state composition even though it is rendered by the native host rather than the TypeScript component layer. The owned Settings no-result state keeps its existing `👀` mark and centered layout but changes its message to punctuation-free `No settings found`.

## Risks / Trade-offs

- [The transition feels sluggish] → Bound the post-event hold to 160 ms and the dimmed reveal to 100 ms.
- [A holder never publishes the requested surface] → Bound the curtain to one second and force a complete fallback repaint.
- [Rapid resize produces excessive writes] → The existing replaceable single-slot presentation lane retains only the newest complete curtain.
- [Background resize adds work to hidden children] → Resize only globally hidden, unclaimed holders; hidden full-surface serialization remains disabled.
- [Two clients use different sizes] → Never pre-fit a tab another client views or controls; spectators remain non-authoritative.

## Migration Plan

No stored data migration is required. The view payload's optional geometry remains backward-decodable. Rolling back removes the dimmed reveal first; rolling back the full change restores direct intermediate resize presentation and activation-time convergence.
