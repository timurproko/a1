# Owned-dialog pointer interaction

## Current behavior

- `ViewportPointerController` routes reports inside painted overlay/input-surface rectangles to `handleLocalMouse`, but finding a surface only at the pointer position does not provide an outside-dismiss target or a pointer-leave notification.
- `ModelsDialogComponent` uses an in-place `PiModalFrame`, a keyboard-selected index, and a separate active-model marker. It has no mouse handler. Its deferred loader and presenter wrappers must retain any new mouse/cancel capability.
- `AppsDialog` and shared selector adapters have existing selection/cancel callbacks but do not expose consistent semantic mouse targets through the owned shell.
- `SettingsApp.onMouse` explicitly consumes structured-dialog pointer input without acting. Its configure panels already use the shared centered frame; their centered/clipped geometry must be the geometry used for hit testing.
- Existing theme-owned active-row backgrounds represent keyboard navigation. They are not mouse hover and must remain unchanged.

## Decisions

### Independent keyboard selection and mouse hover

Keep keyboard-active identifiers/indices and pointer-hover identifiers as distinct state. Motion updates only hover. Enter, Space, and other keyboard actions continue to target the keyboard-active item regardless of hover. A click dispatches the target's semantic action directly rather than temporarily steering the keyboard index or synthesizing navigation keys. A completed action may naturally close, advance, or update the workflow; motion must never do so.

Hit targets identify actual visible choices and controls, not text inferred from rendered arrows or ANSI strings. They are produced alongside rendering from the same clipped row window, horizontal insets, frame offsets, and current model IDs. Blank rows, offscreen results, title text, and non-actionable hints do not acquire actions. Presses on frame padding do not count as outside presses.

### Quiet theme-owned hover

Expose a shared hover-text painter at the semantic theme boundary. Blend each normal text/metadata foreground toward the active accent by 40%, retaining 60% of the original. Resolve terminal-default foreground through the existing adapter's theme/capability handling; do not assume white. Preserve semantic distinctions, ANSI attributes, width, graphemes, and any preexisting keyboard-active background. Do not introduce a hover background, reverse video, underline, or pure-accent replacement. Compute concrete colors outside hot render loops where practical and refresh on theme/accent changes. Use the existing truecolor/256-color conversion rather than route-local RGB escapes.

### Pointer ownership and dismissal

Use the most recently painted bounds and explicit cancellation capabilities. Invalidate hit regions when geometry becomes stale; do not act on old coordinates after resize or replacement. The topmost cancellable owned dialog receives outside primary presses even when the pointer is over the transcript or an underlying route. Invoke its existing cancel path and consume the press plus its following motion/release. Never act through the dismissed surface, dismiss two stacked surfaces at once, or leave deferred refresh work and dialog promises alive.

Send leave/clear-hover behavior when the pointer leaves a dialog, and clear hover after filtering, step transitions, catalog refresh, replacement, cancellation, and disposal as needed to prevent stale IDs. Non-primary presses and wheel reports never dismiss a dialog. Existing wheel behavior remains unchanged in this change, including Settings content scrolling behind a fixed configure panel. A wheel must not activate a row or write a setting.

For in-place Models, an outside primary press cancels before ordinary transcript selection begins. Later transcript gestures work normally after dismissal. Wheel input outside Models remains transcript scrolling without dismissal. This deliberately updates the former contract that permitted starting transcript selection while Models stayed open.

### Dialog actions

- Models: clicking model text/provider activates that model through the existing switch workflow; clicking its scope circle toggles only that model's session scope; clicking `all` or `scoped` changes the filter. None of these uses the keyboard-active row as a substitute for the clicked target. Existing keyboard scope/order/save actions, dirty-state semantics, async switching, and prompt restoration remain unchanged.
- Launcher and shared owned selectors: click the visible choice to run its existing select callback; outside click runs cancel. Existing text-input mouse editing remains supported, and opaque extension components are not introspected.
- Settings: clicking a generic structured/Warnings row performs the same change as Enter on that row; clicking a Thinking Level model opens its next step and clicking a level performs the existing whole-object write; clicking a Default Model row keeps its existing immediate-close/asynchronous-persistence behavior. Outside primary press closes the configure workflow without performing an additional write, including from Thinking Level step two. Escape retains its existing step-specific back/close behavior. Already-applied changes are not rolled back by cancellation.

## Delivery outcomes

1. Shared dialog hover/target contracts and shell outside-dismiss/gesture routing.
2. In-place Models click controls, independent hover, and cancellation wiring.
3. Launcher, shared owned selectors, and Settings configure dialogs adopting the same pointer policy.

`tasks.md` follows exactly that order. Each outcome includes its focused tests and is committed, pushed, and checked in the PR before the next starts.

## Focused validation plan

- Shared components/theme: blend math and actual truecolor/256-color output; differing primary/metadata foregrounds; unchanged active-row backgrounds; no hover backgrounds; plain-theme compatibility; clipped, wide-character, and inset hit regions.
- Shell routing: topmost-only outside cancellation, gesture draining, no underlying click/selection, pointer leave, resize/stale geometry, stacked/replaced/deferred components, and subsequent restored input.
- Models: keyboard-selected A while hovering/clicking B; Enter still selects A after hover; clicked B activates B; circle clicks affect B's scope only; filter clicks, narrowed/scrolled windows, refresh, prompt restoration, compact layout, and independent active-model checkmark.
- Other owned dialogs: Launcher/shared selector callback ownership; Settings generic changes, two-step model/level choices, default-model persistence failure/reopen, outside-close from either step, unchanged wheel behavior, and no Settings-list click-through.
- Run only changed-code typechecks, directly relevant test files, and strict OpenSpec validation locally. Broad suites and physical desktop automation are not part of this plan. No manual result or implementation evidence is claimed during planning.

## Approved Settings refinements

Ordinary Settings hover must use the same 60% normal foreground / 40% accent blend as owned dialogs, only for muted values and enabled numeric controls. Per the maintainer's clarification, setting labels and section titles must retain their ordinary foreground while hovered. Hover must not brighten values to pure terminal white, add a background, or move keyboard selection. Scalar value menus retain their existing policy.

Configure panels must no longer expand with tall terminals or large model catalogs. Limit the panel's height budget to 20 rows and its choice window to ten items, reducing the window further on compact terminals while keeping title/search/guidance. Own a list scroll offset independently from keyboard selection: wheel and rail gestures move the viewport without selecting or changing a value; keyboard navigation reveals its active choice when necessary. Use the existing shared scrollbar geometry, glyphs, track/thumb roles, minimum thumb size, drag math, track paging, appearance policy, linger, and live effective scrollbarSpeed. Reserve the rail column consistently for auto/always and remove it for hidden. Wheel reports inside the panel belong to its list; only outside wheel reports retain background Settings scrolling. A rail drag remains captured through motion outside the panel and release rather than dismissing or clicking through. Filter, step, replacement, and geometry transitions reset stale pointer/drag state and clamp/reveal the appropriate choice.

The existing three delivery outcomes remain ordered; ordinary Settings hover extends outcome 3. Bounded configure-panel scrolling is outcome 4 with its own tasks group and progress checkbox. The CI-reported four stale modal/transcript-copy assertions are repaired within outcome 3 without weakening post-dismissal copy behavior.

## Approved stronger hover and status-bar refinement

The maintainer requested a more prominent cue and the same foreground-only style on the status bar. Outcome 5 increases the shared accent contribution from 25% to 40%, superseding the initial strength recorded in outcomes 1 and 3. Status-bar session name and model/provider text blend from their normal dim foreground; thinking text blends from its existing level-specific role. Apply this only to the explicit visible control spans, without adding a background, moving neighboring metadata, altering hyperlink/click targets, or changing the comparison profile. Keep the underlying name-animation lifecycle intact; leaving the hover restores ordinary presentation. Pin actual encoded colors in both truecolor and 256-color paths and exercise provider brackets and real-shell clicks.

## Risks and boundaries

Port wrappers can silently drop pointer capabilities; exercise public adapters/loaders and shell composition, not only controllers. Keyboard-active row background expectations must not be weakened to implement hover. Terminal-default and 256-color conversion can collapse nearby colors; preserve the semantic blend policy instead of hardcoding palette literals. Never infer cancellation from an arbitrary extension's keyboard input or mutate copied upstream/controller internals when a supported owned adapter can provide semantic behavior.
