## 1. Runtime input ownership

- [x] 1.1 Add an opt-in Pi TUI runtime policy that removes complete residual SGR mouse reports only after A1 pre-input listeners run, and verify adapter tests preserve listener order plus keyboard bytes before, between, and after reports.
- [x] 1.2 Keep bracketed paste opaque under the residual-report policy and verify an embedded mouse-looking sequence reaches the focused component unchanged.
- [x] 1.3 Configure only the bare-A1 custom viewport to disable Pi mouse-mode ownership and enable the residual-report policy, and verify default regular/fullscreen adapter and `a1 pi` behavior remain unchanged.

## 2. Selection and lifecycle regression coverage

- [x] 2.1 Add shell-level terminal-output evidence that residual and modified mouse reports followed by Shift-arrow navigation, scrolling, or content updates cannot paint Pi reverse-video selection while A1 dark-blue selection remains functional.
- [x] 2.2 Verify frame controls, overlays, replacement surfaces, wheel routing, right-click paste, mixed input, and complete press/motion/release ownership remain intact with focused shell tests.
- [x] 2.3 Verify bare A1 enables and restores only its owned mouse-report modes across ordinary disposal and failure cleanup, without weakening the emergency terminal reset.

## 3. Validation and evidence

- [x] 3.1 Run focused adapter, shell selection, viewport, lifecycle, and conformance tests plus typechecking, and record the exact passing commands and outcomes in `evidence.md`.
- [ ] 3.2 Build the candidate and record a Windows Terminal manual check covering Shift-modified arrows, wheel scrolling, streaming updates, frame selection, overlays, and replacement surfaces, confirming no white viewport-anchored Pi selection appears and documenting any host-native terminal-selection distinction.
