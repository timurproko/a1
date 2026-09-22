## Context

The hotkeys source is shared by two presentations. `createPiShellHotkeys()` supplies the pinned-style in-feed document used by `a1 pi`, while `renderPiShellHotkeysLines()` supplies rows to bare A1's full-screen `ReferenceScreenApp`. Both currently pass the same Markdown through the standard Pi Markdown renderer, where bold paragraph labels inherit ordinary text color and paragraph-to-table spacing. Settings section headers instead use bold semantic accent styling with no spacer before their first row.

## Goals / Non-Goals

**Goals:**
- Give every bare-A1 shortcut section label the Settings section-header emphasis.
- Place each section's table immediately after its label.
- Preserve the hotkeys data and all reference-screen interaction and geometry outside those removed rows.

**Non-Goals:**
- Restyle tables, the `Keyboard Shortcuts` title, changelog Markdown, or arbitrary Markdown headings.
- Change keybindings, extension shortcut collection, ordering, wrapping, or the `a1 pi` comparison presentation.

## Decisions

### 1. Apply the refinement at the bare-A1 hotkeys row boundary

Keep `hotkeysMarkdown()` as the shared content authority. Add a narrow presentation step for `renderPiShellHotkeysLines()` that identifies the known section-label rows produced by that document, applies the same bold semantic accent used by Settings group headers, and removes only the immediately following blank row introduced before the table. The in-feed `createPiShellHotkeys()` path continues rendering the untouched Markdown component.

This preserves one binding-derived source while avoiding a global Markdown-theme change that would also alter changelog, assistant, or pinned comparison content.

### 2. Cover fixed and optional sections

The presentation step will handle Navigation, Editing, Other, Models dialog, and Extensions. Tests will cover the base document and the optional extension section, assert semantic ANSI styling rather than only plain text, and assert that each heading is directly followed by its table border/header row at representative widths.

## Risks / Trade-offs

- **[Markdown renderer output changes]** -> Match only the known complete section-label rows and verify all expected sections, so unrelated rows remain untouched.
- **[ANSI styling is accidentally asserted as a fixed palette code]** -> Compare against the active theme's accent semantics and retain plain-text row assertions for spacing.
- **[Shared presenter behavior drifts]** -> Keep the shared Markdown/data generator intact and explicitly prove the pinned in-feed path retains its current rows.

## Migration Plan

No data migration is required. Implement the scoped row presentation, update focused tests, and manually inspect `/hotkeys` in bare A1 at a width that shows all section transitions.

## Implementation Evidence

- Focused presenter, reference-screen route, and prompt-input validation passed: 4 files and 56 tests.
- Source typechecking passed with `tsgo -p tsconfig.json --noEmit`; strict OpenSpec validation also passed.
- The generated TypeScript candidate was inspected at 80 columns with an extension shortcut present. Navigation, Editing, Other, Models dialog, and Extensions each carried the same semantic `accent` styling used by Settings, and each next row was its table border rather than a blank spacer.
- The complete local build passed environment reporting, TypeScript compilation, settings/startup generation, and reached the unchanged native process-guardian link. Native linking could not finish because this machine has no Visual Studio C++ tools or Windows SDK and its `link.exe` resolves to Git's Unix utility; required exact-head CI retains responsibility for the complete repository build.
