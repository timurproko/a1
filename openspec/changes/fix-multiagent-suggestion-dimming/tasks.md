## 1. Resident frame fidelity

- [ ] 1.1 Carry libghostty's faint cell attribute through the resident host's active-style representation and ANSI frame writer while keeping host-owned selection normal-intensity.
- [ ] 1.2 Verify style transitions clear faint before ordinary accepted or typed text and preserve all existing foreground, background, bold, italic, underline, and inverse behavior.

## 2. Regression evidence

- [ ] 2.1 Extend the native terminal-fidelity probe with faint ghost-text and subsequent normal-intensity repaint assertions.
- [ ] 2.2 Add the faint-intensity result to the existing fidelity verifier's required fields and run the focused native and verifier checks.
- [ ] 2.3 Record focused validation, preflight evidence, and explicit known-gap disposition in `design.md` before finalization.
