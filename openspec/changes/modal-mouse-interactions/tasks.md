## 1. Shared dialog pointer ownership and text-only hover

- [x] 1.1 Add reusable semantic dialog hit targets and independent pointer-hover state without changing the keyboard-active selection.
- [x] 1.2 Add the theme-owned 75% ordinary-foreground / 25% accent hover painter, preserving metadata roles, truecolor/256-color capability handling, and existing keyboard-selection backgrounds.
- [x] 1.3 Route topmost owned-dialog outside primary presses through explicit cancellation and drain the dismissal gesture without underlying actions; clear stale hover and reject stale geometry.
- [x] 1.4 Carry pointer/cancellation capabilities through relevant port wrappers and add focused component/theme and shell routing fixtures for independent selection, leave, stacking, resize, replacement, and no click-through.

## 2. In-place Models mouse interaction

- [ ] 2.1 Render and hit-test Models row text, scope markers, and all/scoped filter controls from the same clipped layout without moving keyboard selection on hover.
- [ ] 2.2 Dispatch clicked model/scope/filter actions through existing workflows and retain dirty scope, save/order shortcuts, active-model markers, deferred loading, and catalog-refresh semantics.
- [ ] 2.3 Add outside cancellation for the docked Models surface and preserve prompt restoration and non-dismissing outside wheel scrolling.
- [ ] 2.4 Add focused Models, deferred-adapter/presenter, and shell fixtures proving keyboard-active A remains the Enter target while the pointer hovers B, direct clicked-target actions, compact/resize geometry, and restoration.

## 3. Mouse interaction across owned selector and configure dialogs

- [ ] 3.1 Adopt shared independent hover, direct clicked-choice activation, and outside cancellation in Launcher and shared A1-owned selectors while preserving existing input editing and leaving opaque extension surfaces and the comparison profile unchanged.
- [ ] 3.2 Replace Settings configure-dialog pointer blocking with hit-tested generic/Warnings changes, Default Model selection, and both Thinking Level steps through existing backend and undo authorities.
- [ ] 3.3 Close Settings configure workflows on an outside primary press without a write or underlying action, including from step two; preserve Escape back/close, existing wheel behavior, and asynchronous persistence failure handling.
- [ ] 3.4 Add owner-focused selector and Settings fixtures for independent keyboard focus, blended text-only hover, clicked-target actions, outside gesture ownership, clipped geometry, and async failure/reopen; update user-facing interaction documentation.
