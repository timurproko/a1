## Context

See `proposal.md` for motivation. The planning base is `fd1458af` on `develop`.

Bare A1 routes both an explicit `/changelog` invocation and an automatic current-release note through the owned `changelog` reference route. The explicit command opens that route without input and loads the complete packaged history. Startup supplies the exact current note as `UiRouteInput.document`. `createOwnedRouteHost` currently assigns both forms the single `CHANGELOG_TITLE` value, `What's New`.

The `a1 pi` comparison profile does not use this owned route. Its workflow and in-feed `What's New` presenter must retain pinned behavior.

## Goals / Non-Goals

**Goals:**

- Select `Changelog` for an explicit bare-A1 `/changelog` route open.
- Select `What's New` for the automatic current-release route open.
- Lock both title choices with focused route-host coverage.

**Non-Goals:**

- Changing release-note content, ordering, link decoration, persistence, acknowledgement, or startup timing.
- Changing the shared reference-screen frame or the pinned `a1 pi` changelog.
- Adding a user-selectable title or expanding the neutral route-input contract.

## Decisions

### 1. Use the route's existing input distinction

The owned route host will choose the changelog title from the distinction it already uses to choose content: no supplied document means the explicit command and complete history, while a supplied document means the automatic current-release note. This keeps invocation context at the composition boundary without adding a second route or extending `UiRouteInput` solely for presentation text.

Adding a free-form title to `UiRouteInput` was rejected because callers should not control screen chrome and the two supported modes are already unambiguous. Adding a second `whats-new` route was rejected because both modes intentionally share loading, rendering, scrolling, close, and failure behavior.

### 2. Keep the distinction at the owned-route boundary

The existing changelog title constant will represent the command-facing `Changelog` label. The route host will retain `What's New` only for a supplied current-note document, without exporting a second title through the startup graph. This keeps the command's public route metadata accurate while avoiding an unnecessary eager-startup surface for a label used only by this composition branch.

Changing the shared Pi changelog presenter was rejected because it would alter pinned comparison behavior rather than only the bare-A1 modal requested here.

### 3. Verify at the route-host boundary

Focused composition tests will render both an input-free changelog surface and a supplied-document surface, asserting `Changelog` and `What's New` respectively. The provider-failure assertion will also verify that the command path names `Changelog`; existing startup shell coverage continues to protect deferred opening and acknowledgement behavior.

## Risks / Trade-offs

- [The title choice relies on the existing supplied-document meaning.] → Keep that meaning documented in the design and assert both forms at the route-host boundary; introduce an explicit typed mode only if a future non-startup caller supplies a changelog document.
- [A broad replacement of `What's New` could regress pinned Pi or startup release notes.] → Limit source changes to owned-route title selection and leave feed presenters/workflow messages unchanged.

## Migration Plan

No persisted state or content format changes. Deployment changes only the owned command-screen heading; rollback restores the former shared title without migration.
