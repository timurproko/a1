## Context

The footer receives `status.footer.sessionName` from the Pi adapter and currently appends it to the path row for both direct and resident shells. Resident composition separately sends that same authoritative name through the tab bridge so the terminal host can render it in the tab chip. The shell already has an explicit `engine.residentTab` boundary; direct `a1 solo`, resident fallback, and `a1 pi` omit it.

## Goals / Non-Goals

**Goals:**
- Show a resident session name once, in its tab chip.
- Keep direct-session footer naming unchanged.
- Preserve the authoritative name for tab synchronization, rename flows, auto-naming, and program status.
- Preserve footer geometry, PR hyperlinking, truncation, and all non-name content.

**Non-Goals:**
- Change tab-chip naming, clipping, animation, or rename behavior.
- Remove or rewrite session names in the engine view model.
- Change terminal titles/program-status messages.
- Add a user setting for footer-name visibility.

## Decisions

### 1. Pass resident presentation context explicitly to the footer

The owned shell will derive footer-name visibility from whether `engine.residentTab` is present and pass that decision through the shell root to the footer presenter. The footer will omit only the visual session-name suffix when resident presentation is active.

This keeps launch topology at the composition boundary and avoids teaching the generic footer to inspect process environment such as `A1_TAB_ID`.

Alternatives rejected:
- Clearing `status.footer.sessionName` in the view would also remove useful metadata from program status and other consumers.
- Detecting a resident tab from environment variables would hide presentation policy in global process state and make direct/fallback behavior harder to prove.
- Comparing the session name to a tab title would couple the inner shell to terminal-host state it does not own.

### 2. Preserve direct and comparison behavior by default

Footer creation will continue to show names unless the resident shell explicitly opts out. Existing direct bare-A1 fallback, `a1 solo`, test fixtures, and pinned `a1 pi` therefore retain their current behavior without reconstructing launch mode.

Focused tests will cover the path row with repository, branch, and linked PR context in both resident-hidden and direct-visible states. A shell-level resident fixture will prove that the composition flag reaches the rendered footer.

## Risks / Trade-offs

- **[The name disappears from all A1 footers]** → Make visibility default to true and assert direct and comparison rows.
- **[Resident naming stops synchronizing]** → Leave the view model and bridge untouched; assert only rendered footer content changes.
- **[PR badge or truncation regresses]** → Cover resident path rows with the existing linked badge and constrained widths.
- **[Fallback is mistaken for resident mode]** → Key suppression only to the installed resident-tab engine collaborator, which fallback launches omit.

## Migration Plan

No migration is required. The change is presentation-only and can be rolled back by restoring the footer's always-visible session suffix; stored sessions and resident registry records are unchanged.
