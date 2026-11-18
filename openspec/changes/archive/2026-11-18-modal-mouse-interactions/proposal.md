# Mouse interaction for owned dialogs

## Why

A1's Models picker and other owned dialogs require keyboard input even when the terminal supplies mouse reports. Users need clickable choices, outside-click dismissal, and a quiet mouse-hover cue without disturbing the independently keyboard-controlled active item.

## What Changes

- Add shared semantic hit regions and a text-only hover treatment that mixes 75% of each span's ordinary foreground with 25% of the current accent. Hover adds no background, reverse video, underline, or keyboard-selection change.
- Let a primary-button click activate the choice or control under the pointer through its existing action callback. Preserve the existing keyboard selection and all keyboard shortcuts; hovering a different choice never changes what Enter acts on.
- Dismiss the topmost cancellable owned dialog on a primary press outside its current painted rectangle. Consume the entire dismissal gesture so it cannot click, select, or drag the underlying screen. Use the existing cancel lifecycle rather than hiding a live workflow without resolving it.
- Apply the interaction to the in-place Models dialog, Launcher, shared A1-owned selectors, and Settings configure dialogs, including Warnings, Default Model, and both Thinking Level steps. Models retains its input-dock presentation; its scope marker toggles scope, its model text switches model, and its filter labels change the filter.
- Extend the shared 75/25 text-only hover to ordinary Settings labels, values, and enabled numeric controls instead of pure-white hover; retain independent keyboard focus and existing active-row backgrounds.
- Bound Settings configure pickers, including both Thinking Level steps and Default Model, to at most 20 panel rows and ten visible choices when space allows. Scroll their choice lists by wheel, thumb drag, and track paging through the Agent's shared scrollbar policy and live appearance/style/speed settings.
- Keep existing input editing, persistence, async failure handling, and keyboard navigation. Leave the pinned `a1 pi` comparison profile, extension-owned opaque custom surfaces, scalar Settings value menus, and non-cancellable progress surfaces unchanged.

## Capabilities

### Modified Capabilities

- ui-components: independent text-only hover, semantic clickable dialog controls, gesture ownership, and outside dismissal including in-place Models.
- owned-ui-settings: replace the explicit keyboard-only configure-dialog policy with mouse choices and outside cancellation while preserving settings authority and keyboard behavior.
- owned-pi-ui-foundation: reconcile footer direct-editing with outside-click ownership so one dismissal gesture cannot also open another footer dialog.

## Impact

Changes belong to the neutral presentation contracts and UI components, the session-shell's painted input/overlay routing and Launcher, the Pi component/presenter adapters, and owned Settings configure workflows. Tests stay in their corresponding owner roots. No Herdr changes, terminal emulator, new rendering pipeline, global settings, or dependency upgrades are needed.

The original plan was approved for implementation. The maintainer subsequently requested consistent ordinary Settings hover and compact configure dialogs with Agent-style, settings-aware scrolling; those refinements continue in the same change and PR. Merge authority is excluded.
