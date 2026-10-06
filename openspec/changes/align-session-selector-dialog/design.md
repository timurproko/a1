## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the observable contract. The bare-A1 Resume Session selector is a source-attributed Pi component adapted into the shared padded modal frame. One stateful header component currently renders three rows: a title containing the current scope, a right-aligned scope/name/sort summary, and two shortcut rows. The session list renders below that header, so shortcut guidance appears above search and results rather than at the modal footer.

The same selector state also owns asynchronous scope loading and partial-result delivery, delete confirmation, transient status messages, path visibility, and whether rename is available. Progressive discovery must remain visible through the result list and its paging count after the chrome is recomposed. The explicit `a1 pi` comparison profile must retain pinned presentation.

## Goals / Non-Goals

**Goals:**

- Give Resume Session the same title, status, content, and footer hierarchy as the Session Tree and other shared bare-A1 modals.
- Keep all dynamic status and shortcut states available at the bottom of the selector.
- Pin row order, inset alignment, exact labels, active-value roles, full-width selection, aligned result columns, and dynamic footer behavior with focused tests.

**Non-Goals:**

- Changing session loading, search, scope, sort, name-filter, rename, delete, selection, or cancellation semantics.
- Changing keybindings, result-row presentation, modal dimensions, or the pinned comparison profile.
- Generalizing every existing modal through a new abstraction.

## Decisions

### 1. Separate semantic top chrome from dynamic footer presentation

The selector will retain one source of presentation state but expose distinct header and footer components. The header will render only the accent-bold `Resume Session` title and the filter/name/sort status row. The footer will render search syntax, actions, confirmation prompts, errors, and transient status after the session list. Both components will remain inside the shared modal frame so its one-cell inset aligns them with the Session Tree and other modals.

Keeping one three-row header and moving it wholesale was rejected because it would place the title below results. Duplicating mutable scope/status state into unrelated components was rejected because asynchronous loading and transient messages could diverge between the title area and footer.

### 2. Use a stable title and a dedicated filter row

The title will always be `Resume Session`, styled with the shared accent-bold title role. The next row will begin with `Filter:` and list `current | all`, followed by `Name:` and `Sort:` groups. The active scope and current name/sort values will use the accent role; inactive scope choices and labels/separators will use muted or dim roles consistent with established filter rows. User-facing values will use the requested lower-case labels. The row will remain stable during scope loading rather than appending a progress phrase.

Partial all-session results already update the session list as discovery advances. That list will remain responsible for its `(selection/total)` paging count, so the total grows with currently discovered matching items without a second `loading loaded/total` counter in the filter row.

Retaining `Resume Session (Current Folder)` / `(All)` was rejected because it duplicates the filter state. Right-aligning status or loading progress on the title/filter row was rejected because it recreates the density and narrow-width competition this change removes. Replacing the result count with loader work-unit progress was rejected because loader progress and visible matching-session count answer different questions.

### 3. Keep state-specific feedback in the footer position

Ordinary shortcut guidance will remain two semantic rows but move below the result list, followed immediately by the bottom rule. Delete confirmation will replace the ordinary hints there with confirm/cancel guidance. Errors and transient mutation status will also occupy that footer position, preserving current behavior without disturbing title or filter geometry. Rename mode remains its existing compact dedicated state.

Moving only ordinary hints while leaving confirmation and status in the header was rejected because the modal would jump between two feedback locations for the same actions.

### 4. Compose stable result columns before applying selection

Each result row will reserve trailing columns for path metadata, message count, and age. The path column will start at one shared position for the rendered result set, truncate within a bounded width when necessary, and leave explicit spacing on both sides; the title/tree-prefix region will truncate before that boundary instead of consuming path space. Count and age will retain their own aligned columns.

The renderer will fit and pad the complete row to the available width before applying the selected background as the outermost style. This makes every selected row cover the same full width regardless of title or path length and prevents truncation from ending the highlight early.

Keeping one free-form right-hand metadata string was rejected because variable path lengths move the column boundary. Applying selection before final truncation was rejected because truncation can terminate the outer background at different visible positions.

### 5. Verify semantics and ANSI roles rather than snapshotting a terminal image

Focused selector tests will assert exact plain-text row order, shared left inset, title styling, active/inactive status roles, stable loading-time filter text, progressively growing paging totals, full-width selected-background coverage, aligned path/count/age columns, title and path truncation, footer placement, and dynamic confirmation/status behavior. Shell workflow coverage will assert the integrated Resume Session surface no longer includes scoped title suffixes while scope switching and closure still work.

A screenshot-only assertion was rejected because it cannot reliably distinguish semantic ANSI roles or prevent header/footer and row-layout regressions.

## Risks / Trade-offs

- **[Long filter/status rows can clip on narrow terminals]** → Keep the row in the existing width-aware component boundary and add narrow-width coverage that prevents it from displacing the stable title or footer.
- **[Splitting rendering surfaces can desynchronize dynamic state]** → Keep one state owner and render both semantic surfaces from that owner, with tests that exercise scope, sort, name, partial loading, paging totals, confirmation, and status updates.
- **[Moving hints changes selector height and visible-row allocation]** → Preserve the number of semantic hint rows and verify result navigation plus footer adjacency at representative widths.
- **[Fixed metadata columns can starve titles or paths at narrow widths]** → Bound the path allocation, truncate each region independently, preserve count/age columns, and cover both wide and narrow row geometry.

## Migration Plan

No data or configuration migration is required. The change is presentation-only and can be rolled back with the selector composition and its focused expectations; session files and settings remain compatible.
