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

### 3. Share session value formatting while allowing destination-specific headings

Refactor the session-info presenter around one internal structured report: styled identity rows and ordered groups of styled body rows. `createPiShellSessionInfo()` will continue composing that report with Pi's bold in-feed headings and existing leading spacer. A new screen-row helper will render the same report at a requested content width but leave group titles structured for the owned app to paint with its shared section-header role.

This keeps formatting calculations—prompt token totals, cache percentages, warming status, cost breakdown, cache re-billing, and conditional Cost visibility—in one place. Parsing the already-rendered in-feed text was rejected because heading recognition would be brittle and could not preserve semantic group identity for sticky headers.

### 4. Preserve route-plane and comparison-profile boundaries

In bare A1, claiming `session` before `isWorkflowRoute()` means the report never reaches `appendWorkflowResult()` and therefore contributes no selectable, scrollable, or persisted feed rows. Existing owned-route close and interrupt handling restores the custom viewport unchanged. In `a1 pi`, no owned route host is installed, so `/session` continues through the pinned workflow and `createPiShellSessionInfo()` exactly as before.

The feature-adoption matrix and presenter-ownership inventory will record this explicit destination split. Focused integration tests will prove that bare A1 clears the command editor, opens the screen, keeps the feed unchanged, refreshes data on reopen, and restores the viewport on close, while the comparison layout retains its in-feed component.

## Risks / Trade-offs

- **[The asynchronous workflow snapshot leaves an initially blank surface]** → Retain the reference route's existing deferred surface behavior and test both settlement and failure rendering.
- **[Refactoring the presenter changes pinned spacing or values]** → Keep pinned component snapshots/assertions and compare all identity/group rows, conditional Cost variants, and representative widths before and after extraction.
- **[Preamble rows disturb Hotkeys geometry]** → Make the preamble optional and add regression assertions that Changelog and Hotkeys row positions, spacing, and scrolling are unchanged.
- **[A group title is styled twice]** → Keep titles as plain semantic section names across the provider boundary; only `ReferenceScreenApp` applies `renderGroupHeader()`.

## Migration Plan

No stored data changes. Shipping the change redirects bare-A1 `/session` to the owned screen; rollback removes that route claim and naturally restores the existing in-feed workflow. The `a1 pi` path requires no migration in either direction.
