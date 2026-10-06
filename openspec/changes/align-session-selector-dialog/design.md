## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the observable contract. The bare-A1 Resume Session selector is a source-attributed Pi component adapted into the shared padded modal frame. One stateful header component currently renders three rows: a title containing the current scope, a right-aligned scope/name/sort summary, and two shortcut rows. The session list renders below that header, so shortcut guidance appears above search and results rather than at the modal footer.

The same selector state also owns asynchronous scope-loading progress, delete confirmation, transient status messages, path visibility, and whether rename is available. Those states must remain visible after the chrome is recomposed. The explicit `a1 pi` comparison profile must retain pinned presentation.

## Goals / Non-Goals

**Goals:**

- Give Resume Session the same title, status, content, and footer hierarchy as the Session Tree and other shared bare-A1 modals.
- Keep all dynamic status and shortcut states available at the bottom of the selector.
- Pin row order, inset alignment, exact labels, active-value roles, and dynamic footer behavior with focused tests.

**Non-Goals:**

- Changing session loading, search, scope, sort, name-filter, rename, delete, selection, or cancellation semantics.
- Changing keybindings, result-row presentation, modal dimensions, or the pinned comparison profile.
- Generalizing every existing modal through a new abstraction.

## Decisions

### 1. Separate semantic top chrome from dynamic footer presentation

The selector will retain one source of presentation state but expose distinct header and footer components. The header will render only the accent-bold `Resume Session` title and the filter/name/sort status row. The footer will render search syntax, actions, confirmation prompts, errors, and transient status after the session list. Both components will remain inside the shared modal frame so its one-cell inset aligns them with the Session Tree and other modals.

Keeping one three-row header and moving it wholesale was rejected because it would place the title below results. Duplicating mutable scope/status state into unrelated components was rejected because asynchronous loading and transient messages could diverge between the title area and footer.

### 2. Use a stable title and a dedicated filter row

The title will always be `Resume Session`, styled with the shared accent-bold title role. The next row will begin with `Filter:` and list `current folder | all`, followed by `Name:` and `Sort:` groups. The active scope and current name/sort values will use the accent role; inactive scope choices and labels/separators will use muted or dim roles consistent with established filter rows. User-facing values will use the requested lower-case labels. Scope loading progress will stay associated with the active scope in this row without reintroducing scope text into the title.

Retaining `Resume Session (Current Folder)` / `(All)` was rejected because it duplicates the filter state. Right-aligning status on the title row was rejected because it recreates the density and narrow-width competition this change removes.

### 3. Keep state-specific feedback in the footer position

Ordinary shortcut guidance will remain two semantic rows but move below the result list, followed immediately by the bottom rule. Delete confirmation will replace the ordinary hints there with confirm/cancel guidance. Errors and transient mutation status will also occupy that footer position, preserving current behavior without disturbing title or filter geometry. Rename mode remains its existing compact dedicated state.

Moving only ordinary hints while leaving confirmation and status in the header was rejected because the modal would jump between two feedback locations for the same actions.

### 4. Verify semantics and ANSI roles rather than snapshotting a terminal image

Focused selector tests will assert exact plain-text row order, shared left inset, title styling, active/inactive status roles, footer placement, and dynamic confirmation/status behavior. Shell workflow coverage will assert the integrated Resume Session surface no longer includes scoped title suffixes while scope switching and closure still work.

A screenshot-only assertion was rejected because it cannot reliably distinguish semantic ANSI roles or prevent header/footer state regressions.

## Risks / Trade-offs

- **[Long filter/status rows can clip on narrow terminals]** → Keep the row in the existing width-aware component boundary and add narrow-width coverage that prevents it from displacing the stable title or footer.
- **[Splitting rendering surfaces can desynchronize dynamic state]** → Keep one state owner and render both semantic surfaces from that owner, with tests that exercise scope, sort, name, loading, confirmation, and status updates.
- **[Moving hints changes selector height and visible-row allocation]** → Preserve the number of semantic hint rows and verify result navigation plus footer adjacency at representative widths.

## Migration Plan

No data or configuration migration is required. The change is presentation-only and can be rolled back with the selector composition and its focused expectations; session files and settings remain compatible.
