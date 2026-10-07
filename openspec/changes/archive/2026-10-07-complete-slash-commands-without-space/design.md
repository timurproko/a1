## Context

See `proposal.md` for the user-visible problem. Pi TUI's `CombinedAutocompleteProvider.applyCompletion()` owns the ordinary top-level command insertion and always appends one space. Bare A1 already composes an owned autocomplete provider around that behavior for the `/skills:` tunnel, while `a1 pi` intentionally retains the dependency's pinned semantics.

The editor sends both Tab and Enter acceptance through the provider. Tab applies a row and keeps editing; Enter applies the same row and then submits. Argument completion begins only after the user has entered a command-space boundary.

## Goals / Non-Goals

**Goals:**

- Leave a Tab-completed top-level command as `/<name>` with the cursor at its end in bare A1.
- Immediately reopen autocomplete on the exact completed command so its matching row remains visible.
- Let the next `:` immediately form a tunnel spelling such as `/skills:` and trigger its existing suggestions.
- Preserve command execution, argument completion after a manually typed space, extension-provider composition, undo/change notifications, and both history modes.
- Keep the `a1 pi` comparison profile byte-compatible with pinned Pi completion spacing.

**Non-Goals:**

- Adding new command tunnels or changing which commands interpret `:`.
- Removing spaces from argument, path, attachment, resource, or extension-owned non-command completions.
- Changing Enter into an edit-only action, changing command submission, or patching installed Pi packages.

## Decisions

### 1. Adapt only bare-A1 top-level command application

Wrap the ordinary bare-A1 autocomplete provider at the A1-owned composition boundary. Delegate candidate discovery and completion application first, then remove exactly the single spacer generated immediately after an accepted top-level slash-command value and move the cursor back one cell. Recognize this case from the original completion prefix and cursor context rather than from rendered menu text.

The adapter will not alter argument, path/resource, attachment, or forced file completion. It will be installed only for the `a1` keybinding profile; the `pi` profile will continue using `CombinedAutocompleteProvider` directly.

Changing the dependency or copied editor core's completion application is rejected because the requested behavior is an A1-only deviation and the same provider must continue serving the comparison profile unchanged. Replacing raw Tab application in the editor is also rejected because it would duplicate selection/application logic and risk bypassing provider wrappers, undo state, and change notifications; the owned editor may observe the completed result afterward only to reopen its exact filtered row.

### 2. Preserve Enter and manual argument entry

The provider cannot and need not distinguish Tab from Enter. With the generated spacer removed, Enter still falls through to the editor's established slash-command submission path and submits the exact `/<name>` spelling. Tab keeps editing at the command boundary. A user who wants arguments types one space, after which the existing argument provider and completion behavior remain unchanged.

This keeps direct commands such as `/settings` executable and commands such as `/login` editable without inventing a second application path.

### 3. Reopen autocomplete only for the exact Tab-completed command

Before delegating an active top-level command Tab to the existing editor, capture the selected value. After normal application, reopen autocomplete only when the resulting single-line editor text is exactly `/<selected>`, the cursor is at its end, and no generated spacer remains. The provider then returns its ordinary exact match and existing best-match selection, so the user immediately sees the same command row without synthetic rendering or preserved stale list state.

Do not reopen when completion left a suffix after the cursor, produced argument/path/resource text, or retained pinned trailing whitespace. Enter keeps its submit path and the `a1 pi` comparison profile therefore remains unchanged.

### 4. Extend the existing owned tunnel trigger to exact completed commands

The owned editor already intercepts `:` while a tunnel command is selected in an open sole-command search, completes to `/<command>:`, and requests the tunnel rows. Keep the no-menu exact-command fallback for asynchronous cancellation or another provider that closes the exact row. It uses the existing public `setText` and autocomplete request path, preserving undo/change behavior and avoiding a generic colon trigger in the copied editor core.

The tunnel's candidate labels, filtering, selected-description styling, application result, submission rewrite, and history behavior remain unchanged. Commands without a declared tunnel, text with any suffix, and cursors away from the exact command continue to treat `:` as ordinary input. The copied-source provenance and deviation ledger record both accepted editor exceptions.

### 5. Verify both owned editor paths and the comparison profile

Focused tests will run with persistent history enabled and disabled. They will assert that Tab produces no trailing space and immediately shows the exact matching row for ordinary, argument-bearing, and tunnel commands; a manually typed space still opens argument completion; and `/skills` followed by `:` opens the existing tunnel. Separate comparison assertions will prove `a1 pi` still appends the pinned trailing space.

## Risks / Trade-offs

- **[Risk] The adapter removes user-authored whitespace.** → Remove only the one provider-generated spacer at the exact returned command boundary; preserve all text after the original cursor.
- **[Risk] Argument completion no longer starts automatically after Tab.** → This is intentional: Tab leaves the completed command visible and delimiter-ready; typing one space restores the established argument path.
- **[Risk] Provider wrappers observe unexpected results.** → Keep discovery and application delegation intact and cover an extension wrapper composed over the owned provider.
- **[Risk] Tab revives a stale or unrelated menu.** → Reopen through a fresh provider request only when the applied selected value exactly equals the complete editor text and cursor boundary.
- **[Risk] Comparison parity drifts.** → Gate spacer removal on the bare-A1 profile; the comparison's trailing space prevents reopening, and a focused assertion retains pinned behavior.

## Migration Plan

No data or configuration migration is required. Rollback removes the bare-A1 provider adapter and restores the automatically inserted space.
