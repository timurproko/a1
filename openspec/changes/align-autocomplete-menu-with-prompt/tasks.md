## 1. Presentation

- [x] 1.1 Make `PromptInput.render` emit `after` rows without the prompt-prefix inset while continuation rows keep theirs; verify the prompt-input unit test asserts a flush `menu` row and fails against the current inset.
- [x] 1.2 Update the above-prompt placement test so reference rows are right-padded to the frame instead of left-inset, keeping byte parity for candidate content, sizing, pagination, and navigation in both history modes.

## 2. Validation

- [x] 2.1 Run the prompt-input, above-prompt placement, prompt-input UX, and shell component scopes plus typechecking; record passing evidence or explicitly disposition every observed gap before finalization.
- [ ] 2.2 Hand off the built candidate for a physical check that `→` sits under `❯`, the command under the draft text, and the command-to-description gap is unchanged; record the outcome.
