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

## Maintainer Settings refinements and CI repair

The maintainer requested that ordinary Settings values use the same subtle accent blend rather than pure-white hover, with matching labels and enabled numeric controls. The shared list-row renderer now uses the existing theme hover painter per semantic span; it retains normal selected/unselected roles and backgrounds, numeric disabled state, and independent keyboard focus. Focused shared-row, real truecolor/256-color, and Settings fixtures cover that behavior.

The finalized candidate's resource-sensitive CI partition reported four old tests expecting a transcript drag to copy while Models/Fork/Login/Logout stayed open. Their assertions now require the first outside gesture to dismiss without selection or clipboard output and a subsequent independent gesture to copy through the unchanged clipboard path. All four focused repaired cases passed; unrelated opaque extension-surface routing remains unchanged. No product behavior, assertion, clipboard coverage, or validation requirement was weakened to bypass the report.

The additional approved compact-dialog/scrollbar outcome bounds the shared configure-panel budget to 20 rows and its choice window to ten items. SettingsDialogList owns the independent viewport and delegates rail geometry, glyphs, hover/drag state, track paging, activity timing, and painting to the existing shared scrollbar and Settings rail helpers. Live effective appearance/style/speed come from the same Settings accessors already used by the main list. Inside-panel wheel reports scroll only its choices; outside wheel reports retain background ownership. A rail gesture stays captured outside the panel and through release; query, step, size, and disposal transitions clear stale targets/captures.

Focused scrolling fixtures cover large Thinking Level/Default Model/generic catalogs, all three wheel distances, unchanged offscreen Enter targets, thin/thick thumb drag outside the panel, track paging and non-primary refusal, auto hover/linger/fade and timer disposal, hidden and live style/appearance/speed changes, filtering and semantic clicked targets, keyboard reveal after independent scrolling, and resize during drag. The shared panel target fixture excludes both reserved rail cells from row activation. The original 93 Settings tests also cover the small-catalog, nested-write, undo, and asynchronous recovery paths. Build/typecheck and current exact file results are reported at handoff rather than invented as physical desktop acceptance.

## Known-gap disposition

No implementation gap is identified within the approved owned-dialog scope. Opaque extension-owned custom surfaces, scalar Settings value menus, non-cancellable progress surfaces, full-screen application routes, and the pinned comparison profile intentionally keep their existing policy. Already-applied scope/settings changes are not rolled back by cancellation. Physical terminal/manual acceptance has not been performed or claimed. No Herdr source change, installed-runtime deployment, process restart, publication, or merge is included.
