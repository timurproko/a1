## Why

A1 has strong repository-level isolation around Pi, but the active owned-session UI still concentrates rendering, viewport interaction, input routing, workflow orchestration, and adapter details in two shell classes. At the same time, several neutral-looking abstractions are either duplicated (`PresentationComponentPort`, `PiTuiComponentPort`, and `PiShellComponentPort`) or declared without an active runtime use (`UiAppHost` owns a frame cache but bypasses it during rendering). The result passes boundary governance while making the shell harder to change safely than its component architecture suggests.

This change is a behavior-preserving refactor. It makes the active composition tell the architectural truth: one canonical component lifecycle, a neutral app-route seam, a viewport interaction owner separate from the shell renderer, and a host that actually applies the declared frame-cache contract.

## What Changes

- Extract bare-A1 viewport state, pointer routing, selection auto-scroll, activity expiry, and editor-pointer ownership from `OwnedUiSessionShellRoot` into a focused session viewport controller. The shell root remains responsible for assembling document and dock rows and handing a frame to that controller.
- Make the presentation component lifecycle the canonical contract reused by Pi TUI and Pi shell component ports instead of redeclaring the same methods in each adapter.
- Move the owned-app route surface/host contract out of the Pi-owned integration and into the neutral UI app owner. Keep a compatibility re-export at the old integration entry while production composition uses the neutral owner directly.
- Route `UiAppHost` rendering through its `FrameCache`, preserving always-stale behavior for apps that declare no revision contract and enabling reuse for apps that do.
- Enforce shortcut conflicts when the settings screen's declarations are assembled rather than only in isolated component tests.
- Add governance coverage for the new responsibility boundary so viewport interaction cannot silently move back into the shell root.

Deliberately excluded: no visible layout, color, keybinding, command, settings, extension, transcript, selection, or terminal behavior change; no new customization slots; no removal of the existing versioned customization contract; no engine replacement; and no rewrite of Pi component presenters.

**BREAKING**: none. Existing Pi integration route types remain re-exported for compatibility.

## Capabilities

### Modified Capabilities

- `owned-ux-architecture`: active UI composition has one canonical component lifecycle, neutral seams live with their neutral owner, and stateful interaction policy is separated from the render root that composes surfaces.
- `ui-apps`: the app host applies the declared frame-cache contract while preserving uncached rendering for apps without revisions, and owns the vendor-neutral route surface contract.
- `owned-pi-ui-foundation`: the custom viewport keeps exact accepted behavior while its state/input controller becomes independent from shell document/dock composition.

## Impact

- Modified: `src/integrations/pi/session-ui/`, `src/integrations/pi/tui-runtime/`, `src/integrations/pi/components/`, `src/ui/apps/`, `src/composition/`, architecture policy, and focused tests.
- No package, persistence, native, protocol, command, setting, or user-visible change.
- This is a separate refactor pull request based on current `origin/develop`; it does not stack on the prompt-input feature branch.
