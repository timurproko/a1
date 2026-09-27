## Context

Bare A1 asks for project trust before constructing project-aware services. It currently exposes only persisted Trust or Do not trust, despite pinned Pi also offering parent-folder and session-only choices. Escape returns `null`; preflight interprets that as a temporary fail-closed launch, then starts the shell with a warning. This creates an unadvertised trust state and requires an alternate-screen handoff that can briefly reveal terminal content.

A trust-preflight warning also currently enters the runtime's generic diagnostic list as `engine-startup`, which places it at the top of an otherwise empty transcript viewport. Bare A1 already owns a severity-aware transient notice dock immediately above the editor.

## Goals / Non-Goals

**Goals:**
- Offer the same five current-folder, parent-folder, and session-only trust outcomes as pinned Pi.
- Require one visible trust outcome before bare A1 continues.
- Make Escape the visible clean-exit action after exactly-once terminal restoration.
- Make Escape the only bare-A1 trust-selector exit; Ctrl+C does not dismiss it.
- Put exceptional fail-closed trust warnings where the user will next type.
- Preserve pinned `a1 pi` behavior.

**Non-Goals:**
- Changing pinned Pi's persistence updates, defaults, ancestor inheritance, or resource loading.
- Removing fail-closed handling for unavailable input, stream end, or prompt errors.
- Moving ordinary model-scope or service startup diagnostics.
- Changing ordinary in-session modal Escape behavior.

## Decisions

### 1. Bare A1 exposes pinned Pi's five trust outcomes and one explicit exit

The selector offers Trust, Trust parent folder, Trust for this session only, Do not trust, and Do not trust for this session only. Parent-folder trust persists the ancestor and clears a narrower current-folder entry; session-only choices affect only the current launch. Escape exits without selecting or persisting trust. Navigation and Enter select any visible outcome; compatibility `y`/`n` select persisted Trust or Do not trust. The hint advertises `Esc to exit`; Ctrl+C is ignored by the bare selector rather than acting as a second exit.

Treating Escape as Do not trust was rejected because it would persist a decision the user did not select. Continuing with a temporary untrusted state was rejected because it preserves the confusing third trust state.

### 2. Escape aborts before runtime construction

On Escape, the prompt restores raw mode and applies A1's shared emergency terminal reset, then returns bounded exit control carrying status 0. The reset disables bracketed paste, mouse/focus tracking, synchronized output, and enhanced keyboard modes before leaving the alternate screen, then preserves the restored parent cursor while resetting parent-screen margins and restoring wraparound and cursor visibility. Trust preflight propagates that control instead of converting it into a restricted launch. The UI entry point treats it as an expected silent termination rather than a fatal crash and invokes the bounded process terminator instead of only assigning `process.exitCode`. Escape's successful status also prevents the development launcher from applying its nonzero-child emergency reset a second time, matching the normal owned-UI exit path.

This prevents project-aware services and the owned shell from being created after Escape, eliminates the cancel-to-shell transition, and ensures the prompt's resumed stdin handle cannot keep the process alive after terminal restoration. A1 writes nothing into the restored parent buffer; with the cursor position preserved across the margin reset, the parent shell retains every prior row and paints its next empty prompt normally.

### 3. Exceptional trust warnings remain prompt-adjacent

The runtime integration tags only a non-null fail-closed trust diagnostic as `project-trust`. Bare A1 excludes that code from the transcript document and translates it once into the existing warning dock. Unavailable input, stream end, or ordinary prompt failure therefore remains transparent without placing a warning at the top of an empty viewport.

### 4. Comparison presentation and cancellation remain pinned

The `a1 pi` presentation uses the same five trust outcomes while retaining its top-left profile, pinned Escape/Ctrl+C cancellation, and startup-diagnostic presenter above the banner.

## Risks / Trade-offs

- **[Exit could be mistaken for Do not trust]** → Save no decision and return directly to the parent terminal; the next launch asks again.
- **[The visible exit could be mistaken for a failure]** → Escape exits successfully with status 0 and no crash report; Ctrl+C does not dismiss the bare selector.
- **[Resumed stdin could retain the process after restoration]** → Route the expected Escape through the same bounded output-flushing process terminator used by ordinary owned-UI completion.
- **[Resetting parent-screen margins could move the cursor and overwrite prior rows]** → Save and restore the parent cursor around the margin reset, then emit no parent-buffer content so the shell owns its next prompt.
- **[The restored shell could inherit a hidden cursor or bracketed-paste mode]** → Use the shared idempotent emergency reset, including a parent-screen cursor show after alternate-screen leave, rather than the prompt's former minimal sequence.
- **[A trust warning could be duplicated]** → Exclude `project-trust` from bare A1's document diagnostics and guard dock translation once per shell.
- **[Comparison behavior could drift]** → Cover both bare and comparison input/presentation paths.

## Migration Plan

No data migration is required. Existing trust records and sessions are unchanged. Rolling back restores Escape's temporary untrusted launch and top-of-viewport warning placement.
