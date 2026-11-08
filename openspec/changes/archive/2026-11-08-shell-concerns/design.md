# Design

## Context

The presenter coordinates submission, routing, workflows, extensions, lifecycle and dialogs for one session. Earlier changes moved submission, dialog coordination, clipboard and suggestions into their own classes. The selectors and the prompt-history binding are the largest remaining blocks of behaviour in the presenter. The root composes transcript, workflow output, chrome, the chip store and the viewport, but still forwards about half of the chip store and viewport calls.

## Decisions

- **Selectors receive typed ports, not the presenter.** `SessionSelectors` gets:
  - the root;
  - the terminal runtime port;
  - the dialog coordinator;
  - the session presenters;
  - the backend's catalog, settings and identity;
  - `runWorkflow`, `sendSlashPrompt` and `reportError`;
  - the extension bridge's `input`;
  - `shutdown`;
  - a `disposed` check;
  - the custom-viewport flag.

  This follows the existing rule that a concern gets typed ports, not the presenter.
- **The generic `showSelector` stays on the presenter.** It is a thin public entry onto the dialog coordinator that tests and the reference screens use. It is not one of the workflow selectors.
- **Prompt history is a collaborator, not a registered concern.**
  - Its close is asynchronous and the presenter already awaits it during disposal.
  - Its rebinding follows the session binding generation, not the concern replacement fan-out.
  - Registering it as a concern would change the declared reset order for no gain.
- **Expose, don't forward.** `root.promptChips` and `root.viewport` are read-only references to components the root already constructs. A root method survives only when it combines a component with root state, such as the editor text or the layout invalidation.
- **Composition keeps one module.** The bare-port builder stays a function inside `owned-ui.ts`. A new module would grow the pinned startup graph for no structural gain.
- **The startup file cap rises by three.**
  - The pinned cap is the exact current file count, so any split into new modules raises it.
  - The byte cap stays: the moved code is the same code.
  - The baseline is re-pinned with `update-startup-graph-baseline.mjs`.

## Risks

- **Moved selector code could lose a disposal or presentation-hold check.** Mitigation: the selector bodies move verbatim, and the existing workflow, reference-screen and lifecycle tests drive them through the router.
- **Repointing about 70 test call sites could change what a test asserts.** Mitigation: each change only replaces `root.x(...)` with `root.promptChips.y(...)` or `root.viewport.y(...)`.
