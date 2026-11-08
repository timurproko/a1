# Proposal

## Why

The owned-UX spec says the session presenter is a coordinator over focused concerns, and that the render root composes components instead of owning their behaviour. The two biggest classes still break both rules. The size ratchet records `OwnedUiSessionPresenter` at 70 methods / 43 fields and `OwnedUiSessionShellRoot` at 75 / 32, against thresholds of 20 / 15.

- **The presenter opens every dialog itself.**
  - Thirteen `show…Selector` methods, the dialog host they share, and the tree-selection follow-up (`#treeSummary`, `#completeTreeSelection`) live in the presenter, about 330 lines.
  - Most of them repeat the same steps: build the component, close through the dialog coordinator, set the input surface, request a render.
  - `workflow-router.ts` already names this surface as `WorkflowSelectors`, but it is handed the whole presenter.
- **The presenter owns prompt-history binding.**
  - The `PromptHistoryController` options are written out twice: once in the constructor and once when the transcript is rebound.
  - The "user texts from the transcript" fallback is written four times.
  - Its binding state (`#promptHistory`, `#historyBinding`) lives in presenter fields.
- **The root forwards instead of composing.**
  - Seven root methods only pass a call to the prompt chip store.
  - Seven more only pass a call to the viewport controller.
  - About 150 lines of resource-label functions that have nothing to do with rendering sit at the bottom of `session-shell-root.ts`.
- **Composition repeats its bare-profile test.** `composeOwnedUi` checks `settings === null || !bare` ten times, and its failure path and `dispose` release the same resources in two hand-written lists.

## What Changes

- **Selectors.** A `SessionSelectors` class (`session-selectors.ts`) implements `WorkflowSelectors`. It owns:
  - the selector, login, logout, fork, trust, thinking, skills, model, settings, session and tree dialogs;
  - the dialog host;
  - the tree-summary follow-up.

  One private method presents a component in the input dock. The presenter exposes the class as `selectors` and hands it to the workflow router.
- **Prompt history.** A `SessionPromptHistory` class (`session-prompt-history.ts`) owns the history binding and controller.
  - One method builds the controller, used both at construction and on rebinding.
  - One `userTexts` helper reads the transcript.
  - The presenter calls `start`, `synchronize`, `rebind` and `close`.
- **Root.** The root exposes the prompt chip store as `promptChips` and the viewport controller as `viewport`, alongside the `transcript`, `workflow` and `chrome` it already exposes.
  - The fourteen pure forwarding methods are deleted and callers use the component.
  - Root methods that add behaviour, such as waiting for pastes against the current editor text or resetting pastes in the editor, stay.
  - The resource-label functions move to `resource-labels.ts`.
- **Composition.**
  - `composeOwnedUi` computes the bare-profile settings once and builds the bare-only ports in one function in the same module.
  - The failure path and `dispose` release resources through one ordered list.
- **Unchanged.**
  - User-visible behaviour.
  - The selector and dialog components themselves.
  - The prompt-history store format.
  - The concern order.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `owned-ux-architecture`:
  - Dialogs and prompt-history binding are named as session concerns that the presenter only registers.
  - The render root exposes the components it composes instead of forwarding their methods.

## Impact

- `src/app/session-shell/session-shell.ts`, `session-shell-root.ts`, `prompt-submission.ts` and the other callers of the deleted forwards.
- New `session-selectors.ts`, `session-prompt-history.ts` and `resource-labels.ts`.
- `src/composition/owned-ui.ts`.
- Session-shell tests that call the moved methods.
- The size ratchet entries for the presenter and the root shrink.
- The startup graph file cap rises by the three new modules; its byte cap does not rise.
