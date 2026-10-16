## Context

See `proposal.md` for motivation and the resident-terminal-host delta for the behavior contract. The resident server currently sends `bridge.visibility` when a tab gains or loses all viewers. Composition forwards that signal to `OwnedUiTerminalHost`, which rejects render requests and acquires a runtime presentation hold while hidden. Engine events still update semantic state, but terminal writes resume only when visibility releases the hold, producing the observed catch-up burst.

The native holder already separates terminal-state capture from client delivery. It continuously drains each child PTY into its Ghostty terminal emulator, while `surface.subscription` controls whether the holder serializes that state to the attach client. Re-enabling a subscription requests one complete current frame. That boundary can bound inactive transport without pausing the child renderer.

## Goals / Non-Goals

**Goals:**
- Let every resident child process compose and write streaming updates regardless of whether its tab is viewed.
- Keep inactive attach-client surface traffic suppressed and preserve immediate full-frame presentation on tab selection.
- Retain visibility protocol compatibility and all status, input, and controller-attribution behavior.

**Non-Goals:**
- Broadcast inactive surfaces to clients or render more than one tab in the outer terminal.
- Change model execution, transcript semantics, scrolling/follow behavior, tab status derivation, or attention signals.
- Change direct `a1 solo`, comparison `a1 pi`, protocol generation, or resident process lifetime.

## Decisions

### 1. Stop using bridge visibility as a child presentation gate

Resident composition will no longer route `bridge.visibility` into terminal-host presentation holds. The terminal host will accept render requests from its active session presenter using the same scheduling path whether the resident tab is viewed or hidden. The bridge message remains decoded and available for generation-1 peer compatibility, but it will not pause the child's terminal renderer.

Alternative rejected: release the hold only for transcript events. That creates a second event classifier beside the existing TUI scheduler, risks missing extension and dialog updates, and would not make background tabs follow the same rendering rules as active tabs.

Alternative rejected: retain the hold and synthesize frames in the native host. The holder has terminal cells, not the owned shell's semantic state, and cannot advance child-owned layout or animation correctly.

### 2. Keep native surface subscription as the transport throttle

No inactive tab surface will be forwarded to the attach client. The holder will continue consuming PTY output into its private terminal emulator while unsubscribed, then serialize one forced complete frame when the server subscribes the newly viewed tab. This preserves the existing one-visible-surface and input-isolation architecture while removing the child-side stall.

Alternative rejected: keep every holder subscribed and drop surfaces at the server. That wastes serialization, queue capacity, and IPC bandwidth for data the client cannot show.

### 3. Verify continuous production separately from reactivation

Focused shell-host coverage will assert that render-triggering state changes continue to produce terminal writes while resident visibility is false, without waiting for a later visibility transition. Resident composition coverage will assert that visibility notifications do not interrupt status reporting or install a presentation pause. Existing native subscription behavior remains the oracle for withholding inactive client surfaces and delivering a complete frame when selected.

Tests will distinguish a current frame from a delayed flush by recording writes before background updates and requiring those writes to occur before reactivation.

## Risks / Trade-offs

- **[Multiple hidden tabs consume more CPU for animation-only frames]** → Keep native surface serialization and attach-client delivery disabled for inactive tabs; rely on the established TUI scheduler rather than adding a parallel background cadence.
- **[Removing child-side gating exposes PTY backpressure]** → The holder already drains every tab PTY continuously, including while unsubscribed; focused tests will prove writes occur before visibility returns.
- **[A visibility message is mistaken for an unused protocol field]** → Preserve generation-1 decoding and server emission for compatibility; change only its presentation-pause effect in resident composition.
- **[Tab selection shows an incremental frame against another tab]** → Retain the existing subscription-time forced full surface and presentation epoch behavior.

## Migration Plan

No data or settings migration is required. Deploy the child-side gating removal with focused regressions while retaining the native subscription boundary. Rollback restores the visibility hold; it does not alter sessions, registry data, or protocol compatibility.
