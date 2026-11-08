# Tasks

## 1. Selectors

- [x] 1.1 Move the workflow selectors, the dialog host and the tree-summary follow-up into `SessionSelectors` (`session-selectors.ts`), implementing `WorkflowSelectors` with typed ports and one private present-in-dock method. Expose it as `presenter.selectors` and pass it to the workflow router; repoint the tests.

## 2. Prompt history

- [x] 2.1 Move the history binding, controller construction and rebinding into `SessionPromptHistory` (`session-prompt-history.ts`) with one controller factory and one `userTexts` helper; the presenter calls `start`, `synchronize`, `rebind` and `close`.

## 3. Root

- [x] 3.1 Expose `promptChips` and `viewport` on the root, delete the thirteen pure forwarding methods (`handleViewportPreInput` stays, because it defaults from root state), repoint production and test callers, and move the resource-label functions to `resource-labels.ts`.

## 4. Composition

- [ ] 4.1 Compute the bare-profile settings once in `composeOwnedUi`, build the bare-only ports in one function, and release resources through one ordered list on failure and on dispose.

## 5. Baselines

- [ ] 5.1 Lower the size ratchet entries and re-pin the startup graph file count.
