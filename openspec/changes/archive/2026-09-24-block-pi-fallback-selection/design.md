## Context

See `proposal.md` for motivation and `specs/session-frame-selection/spec.md` for the behavior contract. Bare A1 runs its application-owned fixed frame inside Pi's public `TuiAltScreen`. The shell enables SGR mouse reporting itself and routes reports through pre-input listeners to frame selection, controls, overlays, and replacement surfaces. Pi's enclosing fullscreen renderer nevertheless defaults its own mouse support on and retains a reverse-video fallback selection implementation. Any report that survives the A1 listeners can therefore establish a second selection over the fixed outer frame; inner transcript scrolling then moves beneath that outer, viewport-anchored highlight.

The runtime adapter is shared with `a1 pi` and other Pi-backed presentation paths. Bare-A1 behavior must therefore be selected explicitly rather than changing adapter defaults or patching the pinned Pi package. `MouseReportInput` already frames SGR reports and treats bracketed paste as opaque before pre-input routing.

## Goals / Non-Goals

**Goals:**

- Make the custom bare-A1 viewport the sole application-level owner of fullscreen mouse reports and selection.
- Let all A1 pre-input owners run before residual reports are dropped.
- Preserve non-mouse bytes, opaque paste payloads, input ordering, and existing pointer gestures.
- Keep the policy opt-in at the public runtime-adapter boundary so comparison profiles retain pinned behavior.

**Non-Goals:**

- Reimplementing selection in the runtime adapter or changing A1's frame-selection model.
- Patching or forking `@earendil-works/pi-tui`.
- Reconfiguring host-terminal shortcuts or host-native selections that the terminal emulator intentionally intercepts before bytes reach A1.
- Changing regular-mode selection, `a1 pi`, or persisted settings.

## Decisions

### 1. Add an opt-in residual mouse-report policy at the terminal bridge

The runtime adapter will accept a custom-viewport-only option that consumes otherwise unclaimed SGR mouse reports after every registered pre-input listener has processed the input and before the remaining bytes reach Pi TUI. The default remains pass-through.

The policy belongs after the listener chain because frame selection, controls, overlays, owned full-screen routes, replacement surfaces, and future A1 owners must retain first refusal. It belongs before Pi TUI because merely asking each current listener to claim more event kinds leaves future and stale-geometry gaps capable of reactivating the fallback. The residual filter will remove complete SGR reports only, preserve adjacent keyboard bytes in order, and bypass bracketed-paste payloads as opaque input.

Alternative considered: add another shell pre-input listener that claims every report. Rejected because listeners registered later for owned routes would never see input, while registering and reordering a drain around every surface lifecycle would be fragile.

Alternative considered: clear Pi selection after it appears. Rejected because Pi exposes no public clear operation through the adapter, a white frame could still be painted before cleanup, and reaching into package internals would violate the public-boundary constraint.

### 2. Disable Pi's independent terminal mouse-mode ownership for bare A1

Bare A1 will construct its enclosing fullscreen renderer with Pi mouse enablement disabled while retaining the shell's existing explicit `MOUSE_TRACKING_ON`/`MOUSE_TRACKING_OFF` lifecycle. Pi will therefore neither enable its own broader mouse modes at start nor disable modes it does not own at stop; the shell remains responsible for enabling reports after runtime start and restoring them before runtime shutdown.

This setting alone is not considered sufficient: Pi can still parse a report generated under A1's mouse mode if one reaches it. It is paired with the residual bridge policy from Decision 1. Conversely, the residual policy alone would leave two layers independently mutating terminal modes. The two controls together establish one owner for both input and terminal lifecycle.

Alternative considered: rely only on current pre-input routing. Rejected because the defect demonstrates that exhaustive ownership by distributed event branches is not a stable invariant.

### 3. Prove the boundary independently and through the shell

Adapter tests will establish that opted-in fullscreen runtimes do not forward residual press/motion/release/wheel reports to Pi, do preserve keyboard bytes from mixed delivery, keep bracketed paste opaque, and leave the default pass-through behavior unchanged. Shell tests will establish that bare A1 emits only its owned tracking mode, continues to route frame and modal gestures, and cannot produce Pi's reverse-video selection after residual/modified reports followed by keyboard navigation or scrolling. Existing comparison conformance will continue to prove that `a1 pi` does not inherit the policy.

The reverse-video assertion will inspect terminal output and final replayed cells rather than only checking A1's internal selection state, because the defect exists in the enclosing renderer outside that state.

## Risks / Trade-offs

- **[A residual report was implicitly relied on by Pi for a custom-viewport interaction]** → Route all declared A1 surfaces first and cover frame, overlay, replacement, wheel, and paste gestures before enabling the final drain.
- **[The filter mistakes pasted text for pointer input]** → Preserve the existing bracketed-paste opacity boundary and add a payload containing mouse-looking bytes.
- **[Mixed chunks lose or reorder keyboard input]** → Remove only complete report spans and test keyboard bytes before, between, and after reports.
- **[Terminal mouse modes are left enabled on failure or shutdown]** → Retain the shell's existing forced-off disposal path and terminal emergency reset, with lifecycle assertions for success and failure.
- **[Comparison behavior changes accidentally]** → Keep both controls explicitly selected only by `sessionLayout === "custom-viewport"` and retain default adapter behavior tests.
- **[Host-terminal native selection is confused with Pi fallback selection]** → Physical validation will distinguish A1's output-level reverse-video fallback from terminal-emulator selection; terminal-owned shortcuts remain a host configuration concern.

## Migration Plan

No data or settings migration is required. Introduce the opt-in adapter policy and tests, enable both ownership controls for bare A1, then validate the exact build in Windows Terminal by exercising A1 selection, modified-arrow navigation, scrolling, overlays, and replacement surfaces. Rollback removes the opt-in configuration and adapter policy without changing sessions, settings, or the pinned Pi dependency.
