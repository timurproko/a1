## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the observable contract. The current tree selector is a source-attributed Pi port with A1 adaptations layered into the same component. It owns tree flattening, filtering, horizontal clipping, selection, labels, and key dispatch, while bare A1 wraps it with the shared modal frame. Search is currently a manually rendered line backed by the tree list's string state, and the selector adds both an outer spacer and an internal full-width separator. The summary choice is mounted through the extension UI bridge after the tree callback first restores the default editor.

The explicit `a1 pi` comparison route must retain pinned presentation. The affected component copies are bare-A1-owned and already use public TUI components and shared semantic theme helpers.

## Goals / Non-Goals

**Goals:**

- Make tree chrome, search, selection, empty state, and footer composition visually consistent with the Models/Skills dialog family.
- Preserve every existing tree operation and keep the search input's hardware cursor/IME position coherent.
- Replace the tree with the summary choice atomically from the shell's perspective.
- Pin geometry and ANSI role boundaries with focused tests rather than screenshots alone.

**Non-Goals:**

- Changing tree filtering semantics, entry ordering, branch folding, navigation results, labels, copying, summarization options, or workflow outcomes.
- Replacing the tree list with a generic select list; its hierarchy and horizontal viewport remain specialized.
- Changing Models, Skills, the ordinary editor, or the explicit comparison profile.
- Redesigning the multiline custom-summary editor beyond preserving its existing shared frame and footer behavior.

## Decisions

### 1. Keep specialized tree state and use a standard Input as its visual search control

The tree list remains authoritative for query mutation because its key dispatcher must continue to prioritize tree actions and filter bindings before printable search text. A focused `Input` presentation will mirror that query for rendering, giving the tree the same prompt icon, text role, cursor marker, clipping, and IME placement as regular dialogs. The selector will propagate focus to this search control.

Moving all input dispatch into `Input` was rejected because it would require duplicating or reordering the tree's established action-key policy. Continuing to hand-render the query was rejected because it cannot reliably reproduce standard cursor and input styling.

### 2. Recompose the tree frame in standard dialog order

The selector will remove its producer-owned leading spacer and internal separator and arrange semantic children as title, body separation, search input, list separation, tree results, footer separation, shortcut hints, and bottom rule. The shared frame remains responsible for the global one-cell content inset and full-width outer rules. The tree shortcut items and effective key lookup stay intact; only their placement moves from above search to the footer.

Keeping the internal separator as full-width frame content was rejected because Models and Skills do not split search from results. Solving the outer gap in the shell layout was rejected because the extra row originates in this selector and changing shell spacing would affect every input surface.

### 3. Treat message text as description rather than selected-row chrome

Tree rows will retain hierarchy prefixes, labels, and role semantics but remove active-path bullets that compete with the menu selection arrow. Selection will switch from `›` plus whole-row background/bold to the menu arrow `→`, selected emphasis on the primary entry label, and muted descriptive message text. Unselected user and assistant role labels will use green and yellow respectively, while system entries will use the muted unbracketed label `system`. Horizontal viewport measurement will continue to operate on the assembled ANSI row, but no background fill will be added.

Using the generic SelectList was rejected because it cannot represent tree connectors, folding, and horizontal anchor clipping. Painting only part of the row with `selectedBg` was rejected because the requested reference is the foreground-only command-menu selection.

### 4. Make tree-to-summary replacement direct

For a non-current entry with summary prompting enabled, the tree callback will not first clear the input surface. The shell will mount its owned summary selector synchronously so the root replaces the tree directly. On summary cancellation, that selector remains mounted until the asynchronously created tree is ready to replace it, preventing the ordinary prompt from appearing between the two surfaces. The tree will still close before direct navigation when the summary prompt is skipped, and current-entry selection will still close and report `Already at this point`.

Adding a loading surface or delaying rendering was rejected because the existing summary surface can safely remain visible during restoration. Changing the extension bridge's global close/mount behavior was rejected because a global change would risk unrelated extension interactions.

### 5. Remove the extension selector's trailing footer spacer at its owned component boundary

The branch-summary choice uses the shared extension selector. Its existing trailing spacer after semantic hints creates the visible gap before the bottom rule; removing that structural spacer aligns this and other instances of the same standard selector with the shared compact-dialog footer contract without changing input or option behavior. Coverage will verify affected inventoried surfaces continue to use the shared frame and hint helper.

A tree-specific summary selector fork was rejected because it would duplicate a standard modal solely to work around shared component geometry.

## Risks / Trade-offs

- **[Mirroring query state into an Input can desynchronize cursor state]** → Keep the tree query authoritative, reconstruct the visual input from the complete query when it differs so its cursor lands at the query end, and test typing, deletion, clearing, focus, and narrow rendering.
- **[Foreground-only selection may reduce distinction in low-color themes]** → Use the established semantic accent and muted roles already used by menu selection and preserve the explicit arrow.
- **[Removing the shared extension-selector footer spacer affects more than the summary choice]** → Limit the change to the structural trailing row, retain all semantic children, and run focused modal-inventory and session-shell dialog coverage.
- **[Direct replacement could leave a stale surface visible]** → Branch explicitly on summary-prompt policy and test prompted, cancelled, current-entry, and skipped-prompt paths, including every input-surface assignment during cancellation.

## Migration Plan

No data or configuration migration is required. The change is presentation-only and can be rolled back by reverting the component composition and transition edits together; session files and persisted tree-filter settings remain compatible.
