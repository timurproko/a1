## 1. Shared dialog pointer ownership and text-only hover

- [x] 1.1 Add reusable semantic dialog hit targets and independent pointer-hover state without changing the keyboard-active selection.
- [x] 1.2 Add the theme-owned 75% ordinary-foreground / 25% accent hover painter, preserving metadata roles, truecolor/256-color capability handling, and existing keyboard-selection backgrounds.
- [x] 1.3 Route topmost owned-dialog outside primary presses through explicit cancellation and drain the dismissal gesture without underlying actions; clear stale hover and reject stale geometry.
- [x] 1.4 Carry pointer/cancellation capabilities through relevant port wrappers and add focused component/theme and shell routing fixtures for independent selection, leave, stacking, resize, replacement, and no click-through.

## 2. In-place Models mouse interaction

- [x] 2.1 Render and hit-test Models row text, scope markers, and all/scoped filter controls from the same clipped layout without moving keyboard selection on hover.
- [x] 2.2 Dispatch clicked model/scope/filter actions through existing workflows and retain dirty scope, save/order shortcuts, active-model markers, deferred loading, and catalog-refresh semantics.
- [x] 2.3 Add outside cancellation for the docked Models surface and preserve prompt restoration and non-dismissing outside wheel scrolling.
- [x] 2.4 Add focused Models, deferred-adapter/presenter, and shell fixtures proving keyboard-active A remains the Enter target while the pointer hovers B, direct clicked-target actions, compact/resize geometry, and restoration.

## 3. Mouse interaction and consistent Settings hover

- [x] 3.1 Adopt shared independent hover, direct clicked-choice activation, and outside cancellation in Launcher and shared A1-owned selectors while preserving existing input editing and leaving opaque extension surfaces and the comparison profile unchanged.
- [x] 3.2 Replace Settings configure-dialog pointer blocking with hit-tested generic/Warnings changes, Default Model selection, and both Thinking Level steps through existing backend and undo authorities.
- [x] 3.3 Close Settings configure workflows on an outside primary press without a write or underlying action, including from step two; preserve Escape back/close, existing wheel behavior, and asynchronous persistence failure handling.
- [x] 3.4 Add owner-focused selector and Settings fixtures for independent keyboard focus, blended text-only hover, clicked-target actions, outside gesture ownership, clipped geometry, and async failure/reopen; update user-facing interaction documentation.
- [x] 3.5 Apply the shared text-only 75/25 foreground hover only to ordinary Settings values and enabled numeric controls; leave labels and section titles unchanged while preserving independent keyboard focus and the existing row background.
- [x] 3.6 Reconcile the four CI-reported modal/transcript copy fixtures with outside-dismissal gesture ownership while preserving subsequent transcript scrolling and copying.

## 4. Bounded Settings configure dialogs with settings-aware scrolling

- [x] 4.1 Cap configure-panel height and visible choice count while retaining title, description, search, active row, and close guidance on compact terminals.
- [x] 4.2 Add independent list scroll state with shared scrollbar geometry, appearance, thin/thick glyphs, hover/drag activity, track paging, and timed auto fade driven by live effective Settings values.
- [x] 4.3 Route wheel input inside the configure panel to its list using shared speed, capture scrollbar drags through release, preserve keyboard selection, and keep outside-wheel/background ownership intact.
- [x] 4.4 Add focused long-catalog, wheel-speed, thumb-drag, track-page, auto/always/hidden, resize, filtering, step-transition, and hit-target fixtures; document the bounded picker behavior.

## 5. Stronger shared foreground-only hover and status-bar consistency

- [x] 5.1 Increase the shared hover accent contribution from 25% to 40%, retaining 60% of the normal semantic foreground across dialogs and Settings values; Settings labels and titles remain unchanged.
- [x] 5.2 Replace status-bar name/model/provider/thinking hover backgrounds with the same shared foreground blend, preserving thinking-level color bases, text spans, clipping, name animation lifecycle, links, direct clicks, and comparison behavior.
- [x] 5.3 Add exact-color truecolor/256-color and real-shell footer hover fixtures for all controls, provider brackets, neighboring cells, clearing, live accents, and retained click behavior; reconcile shared hover docs and source provenance.
