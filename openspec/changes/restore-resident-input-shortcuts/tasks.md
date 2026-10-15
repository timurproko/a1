# Tasks

## 1. Resident input encoding

- [ ] 1.1 Preserve Ctrl, Alt, and Shift identity for forwarded character chords, with table-driven encoder cases proving plain characters remain stable and combined prompt shortcuts retain every modifier.
- [ ] 1.2 Preserve Ctrl, Alt, and Shift identity for arrows, Home/End, PageUp/PageDown, Insert/Delete, Enter, Backspace, and Tab, with encoder cases covering word movement, selection, deletion, newline, and viewport navigation.

## 2. Native-host integration

- [ ] 2.1 Run the focused terminal-host Rust test suite and strict OpenSpec validation, recording the passing commands in `evidence.md` and confirming no known gaps remain.
