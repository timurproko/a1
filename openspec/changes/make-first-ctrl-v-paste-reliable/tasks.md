## 1. Reproduce and attribute first-use behavior

- [ ] 1.1 Add a cold ordinary-prompt fixture that sends the real standard `Ctrl+V` control input before any mouse/clipboard action; verify it records one key match, one synchronous reservation, one acquisition, and one exactly-once insertion with following typing preserved.
- [ ] 1.2 Add payload-free routing diagnostics for shortcut receipt, match/admission, and right-click admission while reusing existing acquisition/preparation phases; verify records distinguish a dropped key from an empty/failed read without including clipboard content.
- [ ] 1.3 Add controlled acquisition fixtures for first native success, native empty then platform success, native failure then platform success, genuine empty/failure, and cancellation; verify the failing baseline identifies the phase responsible without using a right-click warm-up.

## 2. Repair cold first-paste admission and acquisition

- [ ] 2.1 Preserve the standard `Ctrl+V` input through keybinding activation and custom-viewport pre-input admission; verify the ordinary prompt consumes it only after creating one reservation, while modal/replacement surfaces and `a1 pi` retain ownership.
- [ ] 2.2 Continue an inconclusive or failed native text read through the supported platform fallback under the original abort signal and acquisition deadline; verify a fallback success inserts once and an all-empty or failed read settles without a retained priming dependency.
- [ ] 2.3 Keep fallback adoption identity-safe and finite; verify cancellation, timeout, reservation removal, immediate later typing, and a subsequent independent keyboard paste cannot produce duplicate, reordered, or late insertion.
- [ ] 2.4 Preserve terminal-provided bracketed paste as a no-native-read route; verify a first bracketed payload and bytes following its closing delimiter are each handled exactly once and in order.

## 3. Prove compatibility and packaged behavior

- [ ] 3.1 Extend source-level viewport, editor, shell, and system-clipboard tests for cold keyboard/right-click ordering, clipboard contention, empty/error recovery, text/path/image controls, undo/redo, and follow-state stability; verify focused suites pass without weakening existing limits or assertions.
- [ ] 3.2 Extend emitted-helper/package coverage to start from fresh processes and exercise native-empty/platform-success plus failure cleanup; verify built helpers resolve correctly, share the existing deadlines, and leave no late worker or clipboard action.
- [ ] 3.3 Run focused clipboard/editor/session tests, typechecking, build, architecture/documentation checks, and strict OpenSpec validation; retain exact commands and results for handoff, without substituting local broad regression for required exact-head CI.

## 4. Prepare exact-candidate acceptance

- [ ] 4.1 Add or update the payload-free terminal-host probe so an exact built candidate can report whether first-use paste arrived as a key or bracketed payload and whether admission/acquisition/insertion settled; verify the probe exposes no clipboard contents.
- [ ] 4.2 Prepare the exact-candidate handoff to copy external text, launch bare A1, press `Ctrl+V` before any right-click, continue typing, repeat after a genuine failed/empty read, and compare `a1 pi`; verify expected exactly-once content and the known unsupported clipboard-denial limitation are explicit.
