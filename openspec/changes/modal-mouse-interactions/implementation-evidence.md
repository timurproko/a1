# Implementation evidence

## Scope and implementation

The approved implementation keeps mouse hover independent from the keyboard-active item. Shared semantic targets and the theme boundary supply a 75% ordinary-foreground / 25% accent blend without adding a background. Existing keyboard-active backgrounds and Enter targets remain independent. Models supplies explicit model-text, scope-circle, and filter targets through its deferred port and existing switch/scope workflows.

The shell routes outside primary presses to the topmost explicitly cancellable owned surface and drains the remaining gesture. Footer actions no longer preempt an open dialog's outside cancellation: the first click closes the dialog and a separate click may open the footer control. Floating selectors, dock replacements, and Settings configure panels all retain their own lifecycle and painted geometry. Settings choices activate their explicit clicked row without steering keyboard selection. Outside cancellation from Thinking Level step two closes the workflow without an additional write; Escape retains its back action.

Owned adapters cover Launcher, shared selectors/confirmations, Thinking Level, Skills, authentication provider/method choices, Project Trust, Resume Session, Session Tree, Fork from Message, and Settings object/Warnings/Default Model/Thinking Level configure panels. Owned login cancellation stops pending input and cancellable Share progress aborts through its existing loader behavior. Non-cancellable surfaces have no inferred cancel capability.

Optional composed selector adapters remain deferred. The Settings configure panel's geometry and gesture state were extracted from SettingsApp; pure Models catalog/empty/bulk projections were moved out of its controller. These decompositions preserve the existing architecture, class-size, module-responsibility, and startup-source ceilings rather than changing the budgets. The pinned source ledger records the new owned pointer deviation and regenerated destination provenance for the five adapted upstream controllers; no dependency or upstream identity changed.

## Focused automated evidence

An initial build and full typecheck passed. Source typechecks passed again after the owned selector, Settings controller, and startup-budget decomposition. Architecture boundaries, session-writer guard, product-identity boundaries, package identity, and the regenerated pinned-source ledger passed. The naming audit reported no violations.

Successful focused executions during implementation include:

- Shared pointer/panel/theme and viewport routing: semantic hit targets, unchanged keyboard focus/backgrounds, exact truecolor/256-color blending, leave, stacking, resize/stale geometry, dismissal draining, and restored later gestures.
- Models controller/deferred presenter/shell: clicked model versus keyboard model, scope and filter actions, compact clipping, refresh/disposal, outside cancellation, and retained prompt drafts.
- Launcher shell and footer interaction: floating and docked pointer routing, settings/app activation, topmost outside cancellation, separate post-dismissal footer activation, and retained text/images/selections.
- Settings: direct Warnings/object-part edits, Default Model acceptance and asynchronous failure/reopen, both Thinking Level steps, independent hover, outside close from either step, no write/click-through, compact/resize handling, and unchanged background wheel behavior.
- Owned selector adapters plus existing auth/trust/skills/session/tree/presentation fixtures: public keyboard-controller behavior, semantic callback ownership, normal selected colors, comparison behavior, early input, and optional-module readiness.

The owning focused files include dialog-pointer.test.ts, dialog-panel.test.ts, dialog-selection-row.test.ts, dialog-mouse.test.ts, models-dialog.test.ts, apps-dialog.test.ts, dialog-coordinator.test.ts, settings-app.test.ts, session-viewport-controller.test.ts, footer-name-interaction.test.ts, session-shell-models.test.ts, session-shell-apps.test.ts, session-shell-workflows.test.ts, auth-trust-styling.test.ts, skills-dialog.test.ts, session-selector.test.ts, tree-selector.test.ts, and the existing lazy-selector/presenter and login/extension boundary fixtures in their mirrored owner roots. Final-candidate local results and current CI state belong in the handoff; broad repository suites and physical desktop automation were not run.

## Known-gap disposition

No implementation gap is identified within the approved owned-dialog scope. Opaque extension-owned custom surfaces, scalar Settings value menus, non-cancellable progress surfaces, full-screen application routes, and the pinned comparison profile intentionally keep their existing policy. Already-applied scope/settings changes are not rolled back by cancellation. Physical terminal/manual acceptance has not been performed or claimed. No Herdr source change, installed-runtime deployment, process restart, publication, or merge is included.
