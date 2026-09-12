## Context

See `proposal.md` for motivation and `specs/custom-session-viewport/spec.md` for the behavior contract. The screenshot was taken in Windows Terminal/Git Bash with Model Configuration replacing the input below a visible transcript.

The shared pre-input listener in `src/integrations/pi/session-ui/session-shell.ts` currently returns before viewport handling whenever `runtime.hasOverlay()` or `!root.usesDefaultInputSurface()` is true, clearing viewport pointer state on mouse reports. The comment documents why: the existing controller would otherwise steal settings menus and numeric controls. The viewport controller also mixes transcript input with ordinary-editor clipboard, selection, and dock handling, so simply removing the guard is unsafe. Its existing transcript copy path emits OSC 52 directly without adding a vanilla copy notification.

## Goals / Non-Goals

**Goals:** Separate keyboard focus from spatial pointer ownership through one shared policy; reuse A1's existing viewport selection, scrollbar, and clipboard implementation; make the policy independent of modal identity and nesting depth.

**Non-Goals:** Redesign modal contents or workflows, introduce transcript keyboard focus, change scrollbar settings or copy presentation, select modal text as transcript, or modify installed Pi or comparison profiles.

## Decisions

### 1. Publish current surface geometry at the owned composition boundary

Represent the exposed viewport and topmost modal occlusion using geometry from the frame that actually composes dock replacements and floating overlays. Dock-replacement bounds come from shell composition; overlays require an owned runtime contract for their resolved rectangles and stacking order. Do not infer rectangles from terminal text or inspect private Pi renderer fields. Register geometry generically at the shared surface host, including extension-hosted and nested surfaces, rather than requiring each command to opt in.

Use the same geometry revision for paint and hit testing; invalidate conservative frame reuse when ownership or geometry changes. A full-cover overlay yields no exposed background targets. Transparent-looking modal cells inside its declared rectangle remain modal-owned. An unknown or not-yet-painted geometry must not authorize background click-through; establish safe geometry before exposing an interactive frame rather than permanently disabling transcript handling for that surface.

Alternative rejected: command-name allowlists or special-casing Model Configuration would repeat the defect for other modals. Blindly removing the bypass would regress settings controls.

### 2. Route by region, focus, and gesture ownership

At the shared pre-input boundary, decode mouse reports before choosing an owner. New pointer/wheel interactions over exposed transcript cells or controls go to the viewport; events within topmost modal bounds go unchanged to that surface. Do not run ordinary-editor pointer or paste logic while a replacement input or overlay owns focus. Preserve byte ordering for mixed input chunks and split terminal mouse sequences using the existing parser contract.

Latch the initiating owner for selection and scrollbar drags through release, including crossings into the dock or overlay. A transcript-owned range remains semantic transcript text and is painted below modal layers; crossing a modal does not select modal content or press its controls. Modal-owned drags never become transcript selection. Keep existing viewport-edge auto-scroll cadence. An ownership/geometry transition ends the in-flight gesture and timer and suppresses its remaining reports until release, preventing stale coordinates from acting on a newly revealed surface. Ordinary motion with unchanged geometry must not repeatedly clear selection.

Leave modal keyboard behavior intact. Route `Ctrl+C` to A1 transcript copy only when there is a nonempty owned transcript selection; consume it once so it does not also cancel the modal. Otherwise retain modal key handling, including clipboard shortcuts and local selection precedence. Existing non-copy keyboard selection clearing may run separately without invoking the hidden ordinary editor. Do not repurpose navigation shortcuts that the focused modal already owns.

Alternative rejected: passing `allowWheel=true` through the old controller is insufficient because editor-specific hooks and blanket dock suppression still steal modal input.

### 3. Reuse viewport presentation and copy

Keep the same scrollbar policy, hover/drag timers, semantic selection model, source ANSI styles, OSC 52 copy, and navigation controls used with the ordinary editor. Prevent transcript-owned mouse and copy sequences from reaching vanilla fullscreen selection. Do not add a new toast or copy notification. Keep rail paint and hit targets clipped beneath overlays while preserving configured `auto` linger, `always` overflow visibility, and `hidden` noninteraction.

Opening or closing a modal reallocates viewport space without forcing follow-end or discarding a valid detached position. Streaming and modal navigation retain existing bounded presentation guarantees; conservative geometry changes must not reuse stale hit targets or selected rows.

### 4. Prove universal coverage at the common boundary

During implementation, map every modal entry point to a shared hosting family: built-in selectors, settings and nested menus/structured dialogs, confirmation/permission/authentication flows, replacement inputs/editors, and extension dialogs/overlays. Parameterize common interaction tests across those hosts, with representative real workflows and at least one previously unlisted extension surface to prove there is no allowlist dependency. Record any uncovered route as a blocking gap, not an exception to universal behavior.

Use deterministic controller plus shell/runtime tests for region boundaries, overlapping overlays, per-gesture ownership, copy consumption, stale geometry, mixed input, and `a1 pi` isolation. Include terminal-cell assertions for A1 background-only selection and no vanilla copy banner. Physical acceptance uses the exact built candidate in Windows Terminal with the reported Model Configuration case and additional docked, nested, and floating modal families.

## Risks / Trade-offs

- [Overlay geometry is not currently exposed through a sufficient public contract] → Extend the A1-owned composition/runtime boundary; read the pinned API documentation and relevant linked material before implementation. Do not patch dependencies or use private renderer state.
- [Unblocking transcript input steals modal controls] → Test topmost-region precedence, numeric controls, menus, modal wheel handling, and ordinary-editor isolation before removing the global bypass.
- [Captured gestures trigger controls after a transition] → End capture on geometry/ownership revision, stop timers, and drain the remaining gesture without redispatch.
- [Copy cancels a modal or invokes two selection systems] → Test exactly one clipboard write, no vanilla notification, and unchanged modal state after copying.
- [Streaming or resize paints selection over modal rows] → Share current-frame geometry and preserve layer ordering; invalidate unsafe viewport reuse.
- [Universal surface scope is falsely inferred from one reproduction] → Maintain the host-family inventory and require coverage for built-in, nested, and extension surfaces.

## Migration Plan

No persisted-data migration or dependency update is required. After the specification merges and implementation is explicitly requested, implement in a new detached worktree based on current `origin/develop`. CI is the automated gate; do not run broad local suites without an explicit request. Hand off the built code candidate with the color-preserving `./scripts/dev` entry and precise reproduction steps. Leave the code PR open for user acceptance and explicit merge authorization. Rollback is a code revert; settings and sessions remain compatible. Record acceptance and archive separately after accepted implementation merges.
