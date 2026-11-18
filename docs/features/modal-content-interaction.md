# Mouse interaction with owned dialogs

Bare A1 supports mouse choices in Models, Launcher, Thinking Level, Skills, authentication provider/method choices, Project Trust, Resume Session, Session Tree, Fork from Message, shared owned selectors, and Settings configure dialogs. The pinned `a1 pi` comparison profile and opaque extension-owned custom surfaces keep their existing interaction policy.

## Hover is not keyboard selection

Moving the pointer over a different choice does not move the keyboard-active row, its arrow, or its background highlight. Enter, Space, and other keyboard actions still target the keyboard-active item. Hover changes only the actionable text's foreground: 75% of its ordinary color plus 25% of the current accent. Primary text and metadata retain distinct colors. Hover adds no background, reverse video, or underline; a keyboard-active row keeps its existing background.

The ordinary Settings list uses that same foreground-only blend for hovered labels, muted values, and enabled numeric minus/plus controls. Values no longer brighten to pure white. Disabled controls retain their disabled appearance; the keyboard-active row keeps its existing background and focus. Scalar value menus retain their existing policy.

Clicking a visible choice invokes that choice's existing action directly. Keyboard shortcuts, setting write authority, default/current markers, undo, and asynchronous error handling remain in effect. Titles, blank rows, panel padding, and informational shortcut hints are not inferred buttons.

In the in-place Models dialog:

- Click a model's text or provider to switch to it through the ordinary workflow.
- Click its circle to toggle that model's session cycling scope, without switching or saving.
- Click `all` or `scoped` to change the filter.
- Keyboard scope, provider, ordering, and save shortcuts remain available.

In Settings configure dialogs, click a Warnings/object-part row to change that part, a Thinking Level model to advance to its levels, a level to apply it, or a Default Model row to accept that default. Hover alone does none of these things. Default-model writes still close immediately and persist asynchronously; failure reopens the selector through the existing error path.

## Outside clicks cancel, not click through

A primary press outside the complete painted bounds of the topmost cancellable owned dialog cancels it. Its following drag and release are consumed too: that gesture cannot activate a setting or footer control, open a second dialog, or start transcript selection behind the dismissed dialog. A later independent gesture can interact with the restored screen normally.

This applies to docked Models as well as floating panels. Clicking another footer control while a dialog is open first cancels the existing dialog; click again to open the other control. Clicking inside panel padding does not dismiss. Non-primary presses and wheel input do not dismiss or activate a choice.

Cancellation uses the owning workflow's cancel lifecycle, restoring the prompt draft and attachments where applicable. It does not save pending changes or undo changes already applied. Outside cancellation from Thinking Level step two closes the configure workflow; Escape still goes back one step. Owned login cancellation stops pending input, and cancellable Share progress uses its existing abort path. Non-cancellable progress surfaces do not gain dismissal implicitly.

## Transcript and wheel behavior

Exposed transcript wheel scrolling, scrollbar policy, configured wheel speed, and ordinary selection after dismissal remain owned by the existing viewport controller. Starting a primary gesture outside a cancellable dialog now dismisses it before transcript selection can begin. This deliberately replaces the former behavior that allowed selecting transcript text while Models remained open.

Wheel input outside Models scrolls the transcript without closing the picker. Settings content wheel scrolling remains available behind its fixed configure panel without activating a dialog choice. Scalar Settings value menus retain their existing pointer policy.

## Geometry and ownership

Hit testing uses the same visible row windows, terminal-cell widths, frame insets, centered placement, and clipping as rendering. Docked replacements publish input bounds from shell layout; floating overlays publish their painted bounds through the runtime adapter. Only the top surface's explicit cancellation capability authorizes outside dismissal; there is no command-name allowlist or heuristic interpretation of extension-rendered text.

A gesture stays with its initiating surface through release. Changed or unpainted geometry cancels the old gesture and drains the remainder rather than delivering it to a new owner. Filtering, refresh, resize, replacement, cancellation, and disposal clear obsolete hover and hit targets. Optional owned selector code remains deferred rather than expanding first-prompt loading; comparison controllers stay on their existing path.

The [modal transition inventory](../../config/baselines/modal-surface-inventory.json) remains the authority for specialized workflows. Full-screen application routes, opaque extension overlays/replacements, and non-cancellable surfaces are not treated as cancellable dialogs merely because they cover content.

## Focused evidence

- `test/ui/components/dialog-pointer.test.ts` and `dialog-panel.test.ts`: semantic choice targets, clipped/inset geometry, independent hover, and configure-panel composition.
- `test/integrations/pi/components/dialog-selection-row.test.ts`: exact 75/25 foreground blending in truecolor and 256-color output, with unchanged active backgrounds.
- `test/integrations/pi/components/dialog-mouse.test.ts`: clicked-target callbacks, independent Enter targets across owned selector families, leave/disposal, login cancellation, and progress abort.
- `test/integrations/pi/components/models-dialog.test.ts` and `test/app/session-shell/session-shell-models.test.ts`: model/scope/filter actions, deferred routing, prompt restoration, and outside dismissal.
- `test/features/owned-ui/settings-app.test.ts`: generic and model choices, both Thinking Level steps, outside gesture ownership, asynchronous default-model recovery, and compact/resize handling.
- `test/app/session-shell/session-viewport-controller.test.ts`, `session-shell-apps.test.ts`, and `footer-name-interaction.test.ts`: topmost-only cancellation, no background selection or footer activation, stale geometry, and subsequent restored input.
- `test/integrations/pi/tui-runtime/overlay-geometry.test.ts` and `mouse-report-input.test.ts`: existing overlay projection and ordered physical input framing.

## Manual review

Build the exact candidate and launch it through `./scripts/dev` in Windows Terminal/Git Bash. Open Models, keep one model keyboard-active, and hover another: the keyboard row must stay fixed while only the hovered text subtly changes color. Check model text, scope circles, filter labels, and narrow/compact layouts. Press Enter after hovering another row to check that keyboard focus did not move.

Open Launcher and Settings, then Warnings, Default Model, and both Thinking Level steps. Click choices, hover without clicking, cancel outside, and resize. An outside gesture must only dismiss, not change a background setting or launch the footer control beneath it. Repeat with Skills, authentication choices, Project Trust, Resume Session, Session Tree, and Fork from Message as available. Check prompt draft/attachment restoration and unchanged keyboard save/cancel behavior.

The focused fixtures are automated evidence, not a claim that physical terminal review has been performed. Integration remains a separate maintainer decision for the exact validated candidate.
