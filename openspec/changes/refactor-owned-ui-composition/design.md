## Context

The repository already separates features, contracts, Pi adapters, UI components, and composition through an enforced owner DAG. The remaining coupling is inside the active UI path:

- `OwnedUiSessionShellRoot` owns both frame composition and all custom-viewport interaction state.
- `UiRouteHost` is vendor-neutral in shape but is declared by the Pi-owned integration.
- three internal component ports repeat the same render/input/invalidate/focus/dispose lifecycle.
- `UiAppHost` allocates a `FrameCache` but calls the app renderer directly.

The refactor must preserve pinned-profile parity and every accepted bare-A1 viewport behavior. Moving ownership is allowed; changing terminal output or event routing is not.

## Goals / Non-Goals

**Goals:**

- Give viewport interaction one focused, testable owner.
- Leave `OwnedUiSessionShellRoot` as document/dock composition rather than pointer-policy storage.
- Reuse one canonical component lifecycle across adapters.
- Put the app route seam in a vendor-neutral owner.
- Make declared frame caching operational.
- Add structural checks that prevent immediate recomposition.

**Non-Goals:**

- No visual or interaction redesign.
- No dynamic plugin/customization implementation.
- No change to Pi workflow/controller coverage.
- No replacement of the Pi TUI runtime.
- No broad rewrite of transcript or settings components.

## Decisions

### 1. A session viewport controller owns viewport interaction

A new controller in `pi-session-ui-integration` owns `TranscriptViewport`, scrollbar settings, pointer drag latches, editor-pointer ownership, selection-edge timers, activity expiry, and the pre-input routing algorithm. It receives only the editor operations and callbacks it needs. It does not know transcript block payloads, workflows, dialogs, extension resources, or Pi constructors.

The shell root continues to assemble semantic document rows, prompt anchors, dock rows, and the viewport theme. It asks the controller to compose the exact-height frame and forwards viewport lifecycle/input calls to it. This keeps frame semantics in the shared `TranscriptViewport` and removes stateful input policy from the renderer.

Alternative considered: split the root by moving rendering helpers only. Rejected because the highest-risk coupling is the pointer/timer state interleaved with rendering, not the private render helper names.

### 2. PresentationComponentPort is the canonical component lifecycle

`PiTuiComponentPort` and `PiShellComponentPort` extend `PresentationComponentPort`; they declare only capabilities not present in the canonical lifecycle. Structural compatibility remains unchanged and no bridge gains runtime overhead.

The extension UI contract remains separate because it is a public compatibility contract mirroring Pi extension capabilities, not an internal shell component declaration.

Alternative considered: aliases. Rejected because adapter-local additions such as `wantsKeyRelease` still need a named extension point.

### 3. App routes belong to ui-apps

`UiRouteSurface` and `UiRouteHost` move to `src/ui/apps`. Composition and the Pi shell import them from that neutral public entry. The former Pi integration module re-exports the types so existing imports do not break.

Alternative considered: presentation contracts. Rejected because route registration and app lifecycle are already owned by `ui-apps`; putting half of that protocol in generic presentation contracts would split one concept across owners.

### 4. The app host always consults FrameCache

`UiApp` may expose the existing `RenderCacheContract`. `UiAppHost.render()` calls `FrameCache.render()`, then validates/finalizes the returned frame. Apps with no contract still render every time, exactly as before. A cached app reuses a previously finalized immutable frame only while its revisions and rectangle are unchanged.

Validation is inside the cached render callback, so malformed frames can never become cached.

### 5. Governance checks responsibilities, not arbitrary line counts

A repository test asserts that viewport state/timer/input symbols live in the viewport controller and not in the shell root. Existing behavior tests remain the proof of output and interaction parity. The refactor does not add another broad maximum-line rule that can be satisfied by moving unrelated lines between files.

## Risks / Trade-offs

- **[Input ordering changes during extraction]** → Move the existing algorithm without semantic edits and retain the focused session-shell and viewport tests.
- **[Editor decoration needs pointer state during construction]** → The shell reads controller state through a late-bound optional reference; before controller construction it is false, matching initial state.
- **[A cached malformed frame survives]** → Finalize and validate inside the cache miss callback before storage.
- **[Moving route types breaks consumers]** → Preserve compatibility re-exports from the Pi integration entry.
- **[A structural port change affects assignability]** → Use interface extension only; runtime values and method signatures remain identical.

## Migration Plan

1. Add the spec and focused neutral contract changes.
2. Extract the viewport controller with unchanged shell-facing forwarding methods.
3. Move the route seam and canonicalize component lifecycle declarations.
4. Wire app-host caching and shortcut assembly validation.
5. Add focused tests and governance checks, then open the separate refactor PR. Historical note: this PR used auto-merge under the former behavior-based policy; `separate-specification-and-implementation` supersedes that policy and requires all future refactor/code PRs to wait for local acceptance and manual merge.

Rollback is a single pull-request revert; no stored or protocol data changes.
