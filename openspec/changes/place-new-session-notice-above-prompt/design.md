## Context

The workflow runner already returns the pinned-compatible accent result `✓ New session started`. `OwnedUiSessionShellRoot.appendWorkflowResult` currently classifies every completed `new` result with `name` and `debug` as a transcript-bound command component. In bare A1, a reset session has no semantic transcript rows, so the component appears at the top-left of the viewport as shown in the reported screenshot. The root already owns a transient dock-notice slot immediately above the editor, but that slot currently accepts only dim status, warning, and error presentations and ordinary notices are intentionally allowed to coexist below live `Working…`.

## Goals / Non-Goals

**Goals:**
- Put the successful bare-A1 new-session confirmation at the bottom of an idle frame directly above the input prompt.
- Preserve its pinned semantic accent, exact text, padding, blank rows, and width-aware wrapping.
- Remove it atomically with the accepted-prompt transition to busy so `Working…` takes over the prompt-adjacent status position without both messages being visible.
- Keep the confirmation outside transcript, selection, copy, prompt navigation, persistence, and viewport scroll accounting.
- Keep `a1 pi` behavior unchanged.

**Non-Goals:**
- Moving `name`, `debug`, session information, hotkeys, changelog, or celebratory components.
- Changing generic informational/error/warning dock notices, including their deliberate survival during agent work.
- Changing `/new` wording, cancellation behavior, session creation, prompt dispatch, or working-status animation.

## Decisions

### 1. Give the dock notice an explicit new-session presentation

Extend the root-owned transient notice state with a `new-session` variant. Render that variant through the existing command-message presenter using its `new` shape, preserving the accent styling, one-cell horizontal padding, leading spacer, and vertical blank row already used by the transcript presentation. Route only a completed `new` result into this variant when the custom viewport is active. The pinned route continues through the existing anchored transcript component.

This reuses the dock's established exclusion from transcript semantics and its bottom placement without changing the workflow contract or duplicating presentation rules.

### 2. Retire the confirmation on the accepted busy transition

When the session view transitions from non-busy to busy, clear the `new-session` notice before composing the updated frame. The same update installs the live working status, so the first busy frame contains `Working…` in the bottom-aligned transient tail and no stale confirmation beneath it. If prompt dispatch fails before the engine accepts it, the existing failure-notice path may replace the confirmation but no working status is fabricated.

The existing user/bash block dismissal remains as a defensive later lifecycle boundary. Generic status, warning, and error notices keep their accepted behavior of surviving assistant/tool streaming and appearing below live working status.

### 3. Verify placement and semantic exclusion at the shell boundary

Focused shell tests will render an empty custom viewport after a successful new-session result and assert the confirmation is directly above the editor group, the selectable document remains empty, and the top remains blank. A lifecycle test will drive the accepted first prompt into busy state and assert the confirmation disappears in the same frame that `Working…` appears. A pinned-layout assertion will retain the chronological transcript placement and existing rendering shape.

## Risks / Trade-offs

- [The special notice accidentally adopts dim status styling] -> Keep the semantic variant explicit and render it through the existing `new` command-message presenter.
- [The confirmation and working indicator appear together for one frame] -> Clear only the special notice in the same non-busy-to-busy view update that refreshes status placement.
- [A failed submission is mistaken for active work] -> Bind working replacement to accepted busy lifecycle; retain the existing truthful failure-notice path without fabricating status.
- [The change alters all dock-notice lifecycle behavior] -> Branch only on the `new-session` variant; retain generic notice replacement and dismissal paths unchanged.
- [Pinned parity regresses] -> Gate the new route on the custom viewport and keep focused pinned presentation coverage.

## Validation

Strictly validate the OpenSpec change, run focused session-shell rendering/lifecycle tests, typecheck affected TypeScript, and manually launch bare A1 to run `/new`, confirm the message is directly above the prompt, submit a normal prompt, and confirm the first working frame replaces the message with `Working…`.
