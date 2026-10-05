## Context

See `proposal.md` for motivation. Bare A1 already claims `changelog` and `hotkeys` in `createOwnedRouteHost()` before slash dispatch reaches the pinned workflow table. Those routes mount `ReferenceScreenApp` full screen, append no feed component, and share the owned scrollbar and shortcut footer. `/session` still runs the pinned workflow, whose structured `PiSessionInfoPresentation` is converted by `createPiShellSessionInfo()` into a permanent transcript component.

The session report has two visual levels: `Session Info` plus identity rows, then the `Messages`, `Tokens`, `Cache Warming`, and conditional `Cost` groups. The sectioned reference path currently supports a title followed immediately by groups; it has no generic preamble rows before the first group. Hotkeys groups already use `layoutList()` and `renderGroupHeader()`, which supply the requested yellow Markdown-heading role, one-cell inset, spacing, and sticky active header.

## Goals / Non-Goals

**Goals:**
- Reuse the existing full-screen reference-screen lifecycle for `/session` in bare A1.
- Preserve every current session-info label, value, conditional row, numerical calculation, indentation, and width-aware wrapping.
- Make all report group names use the exact shared group-header component used by Hotkeys and Settings.
- Keep each opening dynamic and keep the pinned comparison profile unchanged.

**Non-Goals:**
- Change how session statistics, cache waste, usage costs, or cache-warming decisions are calculated.
- Add editing, copying, search, refresh-in-place, or a general navigation stack to reference screens.
- Restyle the pinned `a1 pi` in-feed component or modify installed Pi packages.

## Decisions

### 1. Claim `/session` through the existing owned route host

Add `session` route identity beside the existing Changelog and Hotkeys identities and extend the composition-provided reference providers with a session provider. The provider will execute the existing `session` workflow to obtain its typed structured presentation, reject an unexpected outcome or presentation, and convert the successful snapshot into a reference document. Because the provider is invoked for every `open()`, reopening reflects the current session without introducing a second statistics implementation.

This is preferred to special-casing `/session` inside shell slash dispatch: the route host remains the single catalog for full-screen owned routes, while the engine remains the source of session statistics. It is also preferred to passing Pi-specific data through `UiRouteInput`, which would leak integration types into the neutral app seam.

### 2. Extend sectioned reference documents with optional preamble rows

Add an optional width-aware preamble to `ReferenceDocumentProvider`. For a sectioned document, `ReferenceScreenApp` will place the existing screen title and blank separator first, then non-empty preamble rows and one separator, then the grouped rows. Flat Changelog documents and sectioned Hotkeys documents remain byte-for-byte on their current paths because they supply no preamble.

The session provider will use the preamble for optional Name, File, and ID rows. `Messages`, `Tokens`, `Cache Warming`, and conditional `Cost` remain structured sections, so ordinary and sticky headers both go through `renderGroupHeader()` rather than embedding ANSI heading text in provider rows. A session-only screen component was rejected because it would duplicate scrolling, scrollbar, footer, close, and section-pinning behavior.

### 3. Keep the pinned presenter stable and load the screen adapter lazily

Keep `createPiShellSessionInfo()` unchanged for the comparison path. A screen-specific formatter will assemble the same identity and body rows at the requested width, reuse the pinned cache-warming and token-formatting helpers, and leave group titles structured for the owned app to paint with its shared section-header role. Focused parity assertions compare the screen values with the pinned component, including cache percentages, warming economics, cost breakdown, cache re-billing, conditional Cost visibility, and the no-name case.

The formatter and workflow-to-document adapter will load only when `/session` opens. This preserves the exact startup source-byte ceiling; placing the additional report structure in the eager shared presenter exceeded that architectural budget. Parsing the already-rendered in-feed text was rejected because heading recognition would be brittle at narrow widths and could not preserve semantic group identity for sticky headers.

### 4. Preserve route-plane and comparison-profile boundaries

In bare A1, claiming `session` before `isWorkflowRoute()` means the report never reaches `appendWorkflowResult()` and therefore contributes no selectable, scrollable, or persisted feed rows. Existing owned-route close and interrupt handling restores the custom viewport unchanged. In `a1 pi`, no owned route host is installed, so `/session` continues through the pinned workflow and `createPiShellSessionInfo()` exactly as before.

The feature-adoption matrix and presenter-ownership inventory will record this explicit destination split. Focused integration tests will prove that bare A1 clears the command editor, opens the screen, keeps the feed unchanged, refreshes data on reopen, and restores the viewport on close, while the comparison layout retains its in-feed component.

## Risks / Trade-offs

- **[The asynchronous workflow snapshot leaves an initially blank surface]** → Retain the reference route's existing deferred surface behavior and test both settlement and failure rendering.
- **[The lazy screen formatter drifts from pinned report values]** → Reuse shared warming/token helpers and compare identity, group, economics, and conditional Cost output against the unchanged pinned component.
- **[Preamble rows disturb Hotkeys geometry]** → Make the preamble optional and add regression assertions that Changelog and Hotkeys row positions, spacing, and scrolling are unchanged.
- **[A group title is styled twice]** → Keep titles as plain semantic section names across the provider boundary; only `ReferenceScreenApp` applies `renderGroupHeader()`.

## Migration Plan

No stored data changes. Shipping the change redirects bare-A1 `/session` to the owned screen; rollback removes that route claim and naturally restores the existing in-feed workflow. The `a1 pi` path requires no migration in either direction.

## Implementation Evidence

- Eight focused reference-app, composition, shell, presenter, workflow, and ownership suites passed 126 tests; modal-inventory and startup-graph suites passed another 8 tests.
- The production build and both source and bin typechecks passed. Full code-documentation governance, owned-UI customization prerequisites, strict OpenSpec validation, and architecture/provenance checks passed.
- The session screen captures a new workflow snapshot on every open, keeps successful and failed route output outside the feed, dismisses stale dock notices, and leaves the comparison profile on the unchanged pinned presenter.
- Startup reachability remains within the exact protected boundary at 159 files and 1,545,092 source bytes, 19 bytes below the maximum, because the screen formatter and workflow adapter load only when `/session` opens.
- No known implementation or environment gaps remain. The final handoff includes the built `./scripts/dev` color-preserving interactive check.
