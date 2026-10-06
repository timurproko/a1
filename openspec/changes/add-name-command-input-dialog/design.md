## Context

See `proposal.md` for motivation. The engine workflow currently owns direct `/name` mutation and normalized-result wording. The shell already owns bare-A1 replacement dialogs and exposes a compact single-line input through its extension UI bridge. Argument-free `/name` currently reaches the engine, which reports the current name when present or a usage warning when absent.

The `a1 pi` profile is the explicit pinned comparison route, so this product behavior must be scoped to the bare-A1 custom viewport rather than changing the shared engine result.

## Goals / Non-Goals

**Goals:**
- Add one bare-A1 presentation branch for argument-free `/name`.
- Reuse established compact input chrome, focus, keyboard handling, shortcut presentation, and lifecycle cleanup.
- Re-enter the existing direct-name workflow after a valid submission so normalization and result wording have one owner.
- Keep cancellation and empty submission silent and non-mutating.

**Non-Goals:**
- Change the `/name <name>` grammar, session-name normalization, or persistence.
- Add a session-name editor to Settings or Session Info.
- Change the argument-free command result in `a1 pi`, JSON, print, or other non-bare interactive paths.
- Add multiline editing, validation messages, or new shortcuts.

## Decisions

### 1. Intercept only argument-free `/name` in the bare-A1 shell

The shell's workflow router will recognize `name` with a whitespace-only argument while the custom viewport is active and open the input before calling the engine runner. A non-empty command argument will continue directly to the runner, and the comparison profile will continue to call the runner for an empty argument.

Changing the engine's empty-argument result was rejected because it would couple a TUI-only interaction to the vendor workflow layer and alter the pinned comparison behavior. Returning a new `requires-input` engine outcome was also rejected as unnecessary protocol expansion for one owned presentation branch.

### 2. Reuse the existing compact single-line input surface

The shell will request the existing extension-bridge input with the semantic title `Session Name`. That surface already supplies the compact ruled frame, focused single-line editor, display-width-safe caret behavior, and shared Enter-submit and Escape-cancel hints required by the owned dialog contracts.

A new name-specific component was rejected because it would duplicate established input chrome and key handling. Reusing the ordinary message editor was rejected because it would expose multiline, history, autocomplete, and submission behavior that do not belong in this dialog.

### 3. Feed accepted text back through the direct naming workflow

After the input returns a non-whitespace value, the shell will invoke its workflow router again with that value as the `/name` argument. The engine runner remains the sole owner of `setSessionName`, normalization lookup, and `Session name set: ...` reporting. Trimming is used only to decide whether any value was entered; the accepted value itself follows the same argument semantics as direct `/name <name>` input.

Calling the session API directly from the shell was rejected because it would duplicate workflow behavior and could diverge from direct-command normalization or result presentation.

### 4. Treat cancellation and whitespace-only submission as silent dismissal

Escape resolves the existing input as cancelled. A cancelled or whitespace-only response closes the surface, restores the default prompt, and returns a successful handled interaction without appending a workflow result or mutating the current name. This avoids replacing one corrective warning with another and prevents empty input from recursively reopening the dialog.

Keeping the dialog open with an inline validation error was rejected because the requested interaction is intentionally minimal. Treating empty input as name removal was rejected because `/name <name>` has no declared clear-name form and this change does not introduce one.

## Risks / Trade-offs

- **[An existing session name is not prefilled]** → The dialog is an entry flow rather than an inline editor; cancellation preserves the existing name, and direct naming remains available.
- **[Recursive workflow routing could reopen the input]** → Re-enter only with a response whose trimmed content is non-empty, and cover whitespace submission explicitly.
- **[Surface teardown races with session disposal or reload]** → Use the existing extension bridge promise and reset lifecycle, which already cancel and unmount active inputs.
- **[A shared component change could affect unrelated extension inputs]** → Configure the existing surface through its current public shape; do not alter its general rendering or key behavior unless focused implementation evidence proves a minimal shared fix is required.

## Migration Plan

No data migration is required. Deployment changes only the bare-A1 empty-argument route. Rollback removes that shell branch and restores the existing engine warning/current-name result without changing stored session names.
