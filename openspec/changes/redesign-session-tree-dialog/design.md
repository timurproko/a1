## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the observable contract. The current tree selector is a source-attributed Pi port with A1 adaptations layered into the same component. It owns tree flattening, filtering, horizontal clipping, selection, labels, and key dispatch, while bare A1 wraps it with the shared modal frame. Search is currently a manually rendered line backed by the tree list's string state, and the selector adds both an outer spacer and an internal full-width separator. The summary choice is mounted through the extension UI bridge after the tree callback first restores the default editor.

The explicit `a1 pi` comparison route must retain pinned presentation. The affected component copies are bare-A1-owned and already use public TUI components and shared semantic theme helpers.

## Goals / Non-Goals

**Goals:**

- Make tree chrome, filter status, search, selection, empty state, and footer composition visually consistent with the Models/Skills dialog family.
- Preserve every existing tree operation and keep the search input's hardware cursor/IME position coherent.
- Replace the tree with the summary choice atomically from the shell's perspective.
- Pin geometry and ANSI role boundaries with focused tests rather than screenshots alone.

**Non-Goals:**

- Changing filter-mode membership beyond excluding model/thinking metadata, entry ordering, branch folding, navigation results, labels, copying, summarization options, or workflow outcomes.
- Replacing the tree list with a generic select list; its hierarchy and horizontal viewport remain specialized.
- Changing Models, Skills, the ordinary editor, or the explicit comparison profile.
- Supporting multiline custom-summary instructions or external-editor launch; the compact workflow intentionally uses one standard input row.

## Decisions

### 1. Keep specialized tree state and use a standard Input as its visual search control

The tree list remains authoritative for query mutation because its key dispatcher must continue to prioritize tree actions and filter bindings before printable search text. A focused `Input` presentation will mirror that query for rendering, giving the tree the same prompt icon, text role, cursor marker, clipping, and IME placement as regular dialogs. The selector will propagate focus to this search control.

Moving all input dispatch into `Input` was rejected because it would require duplicating or reordering the tree's established action-key policy. Continuing to hand-render the query was rejected because it cannot reliably reproduce standard cursor and input styling.

### 2. Recompose the tree frame in standard dialog order

The selector will remove its producer-owned leading spacer and internal separator and arrange semantic children as title, Models-style filter status, body separation, search input, list separation, tree results, footer separation, shortcut hints, and bottom rule. The filter row will expose all five existing modes as `all | standard | no tools | user | labeled`, treating an unset or upstream `default` initial setting as `all` while preserving explicit non-default choices. Model-change and thinking-level-change bookkeeping will be excluded before mode filtering so it never renders or inflates visible counters, including under `all`. The shared frame remains responsible for the global one-cell content inset and full-width outer rules.

The owned keybinding profile will move forward filter cycling from `Ctrl+O` to `Tab`, matching Models, while retaining individual direct filter actions and reverse cycling. The footer will collapse the verbose direct-filter/cycle hints into `Tab filter`.

Keeping the internal separator as full-width frame content was rejected because Models and Skills do not split search from results. Keeping `Ctrl+O` was rejected because it conflicts with the shell's established more/expand affordance and differs from Models. Solving the outer gap in the shell layout was rejected because the extra row originates in this selector and changing shell spacing would affect every input surface.

### 3. Treat message text as description rather than selected-row chrome

Tree rows will retain hierarchy prefixes, labels, and role semantics but remove active-path bullets that compete with the menu selection arrow. Selection will use the menu arrow `→`, selected emphasis on the primary entry label, muted descriptive message text, and the theme's subtle purple `customMessageBg` as an accent-tinted selected span without bolding the whole row. Unselected user and assistant role labels will use green and yellow respectively, while system entries will use the muted unbracketed label `system`. Horizontal viewport measurement will continue to operate on the assembled ANSI row.

Using the generic SelectList was rejected because it cannot represent tree connectors, folding, and horizontal anchor clipping. The generic `selectedBg` was rejected because it is blue in the owned theme; `customMessageBg` provides the requested low-intensity purple selection while preserving semantic foreground roles.

### 4. Treat label editing as its own compact tree state

Opening label editing will replace the Session Tree title with accent-bold `Label`, place the muted `Empty to remove` subheader directly beneath it, and show one standard input plus save/cancel hints. The search, result tree, and tree-level shortcut footer will be hidden until label editing closes, preventing unrelated filter and navigation controls from competing with the active editor.

Keeping label editing embedded below the search field was rejected because it exposes two input prompts and two unrelated shortcut sets at once. A separate shell modal was rejected because label editing belongs to the tree controller and must restore its exact selection and query state.

### 5. Make tree-to-summary replacement direct

For a non-current entry with summary prompting enabled, the tree callback will not first clear the input surface. The shell will mount its owned summary selector synchronously so the root replaces the tree directly. On summary cancellation, that selector remains mounted until the asynchronously created tree is ready to replace it, preventing the ordinary prompt from appearing between the two surfaces. The tree will still close before direct navigation when the summary prompt is skipped, and current-entry selection will still close and report `Already at this point`.

Successful Pi tree navigation mutates the currently bound session rather than replacing it, so the adapter will explicitly rebuild transcript, model, and thinking projections from that session and emit a fresh view. Pi's navigation result can also return `editorText` when the selected point is a user message; the workflow will carry that text to both the adapter state and shell editor with the cursor at the end only when the editor has no non-whitespace draft, matching Pi. When no text is returned or a draft already exists, the existing draft remains untouched. The adapter will not run the full session-replacement path because that would unconditionally clear editor state.

Adding a loading surface or delaying rendering was rejected because the existing summary surface can safely remain visible during restoration. Changing the extension bridge's global close/mount behavior was rejected because a global change would risk unrelated extension interactions.

### 6. Remove trailing footer spacers at owned extension-component boundaries

The branch-summary choice uses the shared extension selector, and custom instructions use the shared extension input. Their trailing spacers after semantic hints create visible gaps before the bottom rule; removing those structural spacers aligns both with the shared compact-dialog footer contract without changing input or option behavior. Coverage will verify affected inventoried surfaces continue to use the shared frame and hint helper.

Tree-specific selector or input forks were rejected because they would duplicate standard modals solely to work around shared component geometry.

### 7. Use a single-line standard input for custom summary instructions

Custom summary instructions are concise workflow metadata, so the shell will request them through the standard extension input rather than the multiline editor. This provides the same prompt/cursor pattern as tree filtering, an accent-bold dialog title, and only submit/cancel shortcuts; multiline and external-editor hints no longer apply to this step.

Restyling the multiline editor was rejected because it would retain unnecessary newline and external-editor behavior and broaden the change to unrelated editor consumers.

## Risks / Trade-offs

- **[Mirroring query state into an Input can desynchronize cursor state]** → Keep the tree query authoritative, reconstruct the visual input from the complete query when it differs so its cursor lands at the query end, and test typing, deletion, clearing, focus, and narrow rendering.
- **[A selected background can overpower role text]** → Use the low-intensity purple panel color only across the rendered selected span while preserving accent/muted foreground roles and the explicit arrow.
- **[Removing shared extension-component footer spacers affects more than the tree workflow]** → Limit changes to structural trailing rows, retain all semantic children, and run focused extension-UI, modal-inventory, and session-shell dialog coverage.
- **[Direct replacement could leave a stale surface visible]** → Branch explicitly on summary-prompt policy and test prompted, cancelled, current-entry, and skipped-prompt paths, including every input-surface assignment during cancellation.

## Migration Plan

No data or configuration migration is required. The presentation and in-place navigation reconciliation can be rolled back together; session files, editor drafts, and persisted tree-filter settings remain compatible.
