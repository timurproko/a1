## Context

Bare A1 asks for project trust before constructing project-aware services. Its two visible choices persist Trust or Do not trust, but Escape currently returns `null`; preflight interprets that as a temporary fail-closed launch, then starts the shell with a warning. This creates an unadvertised third trust state and requires an alternate-screen handoff that can briefly reveal terminal content.

A trust-preflight warning also currently enters the runtime's generic diagnostic list as `engine-startup`, which places it at the top of an otherwise empty transcript viewport. Bare A1 already owns a severity-aware transient notice dock immediately above the editor.

## Goals / Non-Goals

**Goals:**
- Require one of the two visible trust decisions before bare A1 continues.
- Make Escape the visible clean-exit action after exactly-once terminal restoration.
- Retain Ctrl+C only as the conventional interruption alias.
- Put exceptional fail-closed trust warnings where the user will next type.
- Preserve pinned `a1 pi` behavior.

**Non-Goals:**
- Changing trust persistence, defaults, ancestor inheritance, or resource loading.
- Removing fail-closed handling for unavailable input, stream end, or prompt errors.
- Moving ordinary model-scope or service startup diagnostics.
- Changing ordinary in-session modal Escape behavior.

## Decisions

### 1. Bare A1 has two trust outcomes and one explicit exit

Escape exits the bare-A1 startup selector without selecting or persisting trust. Navigation, Enter, and compatibility `y`/`n` continue selecting one of the two visible decisions. The hint advertises `Esc to exit`; Ctrl+C remains an unadvertised conventional interruption alias.

Treating Escape as Do not trust was rejected because it would persist a decision the user did not select. Continuing with a temporary untrusted state was rejected because it preserves the confusing third trust state.

### 2. Escape aborts before runtime construction

On Escape or Ctrl+C, the prompt restores raw mode and applies A1's shared emergency terminal reset, then returns bounded exit control carrying status 0 for the visible Escape action or conventional status 130 for Ctrl+C. The reset disables bracketed paste, mouse/focus tracking, synchronized output, and enhanced keyboard modes before leaving the alternate screen, then restores wraparound and cursor visibility again on the parent screen. Trust preflight propagates that control instead of converting it into a restricted launch. The UI entry point treats it as an expected silent termination rather than a fatal crash and invokes the bounded process terminator instead of only assigning `process.exitCode`. Escape's successful status also prevents the development launcher from applying its nonzero-child emergency reset a second time, matching the normal owned-UI exit path.

This prevents project-aware services and the owned shell from being created after interruption, eliminates the cancel-to-shell transition, and ensures the prompt's resumed stdin handle cannot keep the process alive after terminal restoration. After leaving the alternate screen, the exit path returns to column zero, erases the restored stale launch row, and writes one `CRLF` so the parent shell paints a visually empty next prompt; accepted trust decisions do not alter the parent row because they continue into A1.

### 3. Exceptional trust warnings remain prompt-adjacent

The runtime integration tags only a non-null fail-closed trust diagnostic as `project-trust`. Bare A1 excludes that code from the transcript document and translates it once into the existing warning dock. Unavailable input, stream end, or ordinary prompt failure therefore remains transparent without placing a warning at the top of an empty viewport.

### 4. Comparison behavior remains pinned

The `a1 pi` presentation retains Escape/Ctrl+C cancellation and renders any resulting trust warning through the pinned startup-diagnostic presenter above the banner.

## Risks / Trade-offs

- **[Exit could be mistaken for Do not trust]** → Save no decision and return directly to the parent terminal; the next launch asks again.
- **[The visible exit could be mistaken for a failure]** → Escape exits successfully with status 0 and no crash report; only the conventional Ctrl+C alias retains status 130.
- **[Resumed stdin could retain the process after restoration]** → Route the expected interruption through the same bounded output-flushing process terminator used by ordinary owned-UI completion.
- **[The parent prompt could share a row with stale launch-command cells]** → Erase that restored row and emit one `CRLF` only for the exit path before bounded termination.
- **[The restored shell could inherit a hidden cursor or bracketed-paste mode]** → Use the shared idempotent emergency reset, including a parent-screen cursor show after alternate-screen leave, rather than the prompt's former minimal sequence.
- **[A trust warning could be duplicated]** → Exclude `project-trust` from bare A1's document diagnostics and guard dock translation once per shell.
- **[Comparison behavior could drift]** → Cover both bare and comparison input/presentation paths.

## Migration Plan

No data migration is required. Existing trust records and sessions are unchanged. Rolling back restores Escape's temporary untrusted launch and top-of-viewport warning placement.
