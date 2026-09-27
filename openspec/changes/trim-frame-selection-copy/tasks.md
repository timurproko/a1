## 1. Specify and test normalized frame-copy payloads

- [ ] 1.1 Add component fixtures for leading/trailing spaces, tabs, newlines, Unicode whitespace, reverse selection, preserved multiline indentation/internal blank lines, and whitespace-only selection; verify visual selected text remains exact while captured clipboard text is boundary-trimmed.
- [ ] 1.2 Add shell fixtures proving automatic release copy and retained-selection `Ctrl+C` deliver the same normalized text and report the normalized character count.
- [ ] 1.3 Add clipboard-helper/transport fixtures proving a whitespace-only frame selection can deliver an empty bounded payload without weakening size, protocol, timeout, or cancellation behavior.

## 2. Normalize only complete-frame copies

- [ ] 2.1 Trim the complete visible-frame selected string before constructing its literal copy snapshot and derive snapshot size/acknowledgement metadata from the normalized payload.
- [ ] 2.2 Permit the isolated clipboard preparation path to submit a valid empty normalized payload through supported destinations while retaining quiet success feedback.
- [ ] 2.3 Verify interior whitespace, selection painting/state, prompt-local copy/cut, semantic `/copy`, `a1 pi`, and terminal-owned regular-mode behavior remain unchanged.

## 3. Validate and hand off

- [ ] 3.1 Run focused selection, session-shell, response-copy, and clipboard transport tests plus source typechecking, build, architecture/documentation checks, and strict OpenSpec validation; record exact evidence and disposition any gap in `design.md`.
- [ ] 3.2 Build the exact candidate and provide a color-preserving `./scripts/dev` handoff that verifies selecting an indented command copies it without outer whitespace while multiline interior indentation remains intact.
